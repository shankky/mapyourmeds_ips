'use strict';

/**
 * Data-access helper — the Node equivalent of DataService/HelperEntityMap.cs.
 *
 * Key differences from the .NET original:
 *  - PARAMETERIZED queries (`CALL sp(?, ?)` with a params array) instead of
 *    string concatenation. This eliminates the SQL-injection class of bugs.
 *  - No reflection mapping needed: the `odbc` driver already returns each row
 *    as a plain object keyed by column name.
 *  - Errors are logged AND propagated (the .NET code swallowed them and
 *    returned empty strings/lists, which hid failures as "no data").
 *
 * The `odbc` pool/connection `.query(sql, params)` returns an array of row
 * objects (with extra non-enumerable metadata properties like `.count`,
 * `.columns`, `.statement`). We normalize to a clean array for callers.
 */

const { getPool } = require('./pool');
const logger = require('../utils/logger');

/**
 * Swallowed-error registry (H1/H5 hardening).
 *
 * The datasync layer preserves the legacy .NET behavior of returning []/"" on a
 * DB/SP error (so the consumer never sees a 500). That is a SILENT-FAILURE risk
 * in a prod pharmacy system: a broken query looks identical to "no data". To
 * make it observable we:
 *   - log every swallowed error at ERROR level (not warn) with full context,
 *   - keep a rolling count + the most-recent failures so /health/deep and any
 *     monitor can SEE that the system is degraded even while returning 200s.
 */
const swallowedErrors = {
  total: 0,
  recent: [], // newest first, capped
};
const SWALLOW_RECENT_CAP = 50;

function recordSwallowed(context, sql, params, err) {
  swallowedErrors.total += 1;
  const entry = {
    at: new Date().toISOString(),
    context,
    sql,
    params,
    message: err && err.message ? err.message : String(err),
  };
  swallowedErrors.recent.unshift(entry);
  if (swallowedErrors.recent.length > SWALLOW_RECENT_CAP) swallowedErrors.recent.length = SWALLOW_RECENT_CAP;
  // ERROR level — a swallowed DB error in prod is a real incident, not a warning.
  logger.error(`[db] SWALLOWED ${context}: ${entry.message} :: ${sql} :: params=${JSON.stringify(params)}`);
}

/** Snapshot of swallowed-error stats (for /health/deep + metrics). */
function getSwallowedErrorStats() {
  return { total: swallowedErrors.total, recent: swallowedErrors.recent.slice(0, 10) };
}

/** Reset counters (tests / after an alert is acknowledged). */
function resetSwallowedErrorStats() {
  swallowedErrors.total = 0;
  swallowedErrors.recent = [];
}

/** Normalize an odbc result (array + metadata) into a plain row array. */
function toRows(result) {
  if (!result) return [];
  // odbc result is array-like; copy enumerable rows only.
  return Array.from(result);
}

/**
 * Execute a parameterized query/stored-proc call and return mapped rows.
 * @param {string} sql   e.g. "CALL sp_api_getpatientbyfacility(?)"
 * @param {Array}  params bound parameters (default [])
 * @param {object} pool   odbc pool (defaults to the IPS pool)
 * @returns {Promise<Array<object>>}
 */
async function executeQuery(sql, params = [], pool = null) {
  const activePool = pool || (await getPool());
  try {
    const result = await activePool.query(sql, params);
    return toRows(result);
  } catch (err) {
    logger.error(`[db] executeQuery failed: ${err.message} :: ${sql} :: params=${JSON.stringify(params)}`);
    throw err;
  }
}

/** Default batch size for cursor fetches (rows per fetch). Tunable via env. */
const CURSOR_FETCH_SIZE = parseInt(process.env.DB_CURSOR_FETCH_SIZE || '500', 10);

/**
 * Cursor-based execution for LARGE result sets. The default odbc buffered
 * `query()` loads the entire result into memory at once, which fails with
 * "[odbc] Error allocating or reallocating memory when fetching data" on big
 * result sets (e.g. sp_mym_getcyclerx_status ≈ 15 MB / ~20k rows). This pages
 * through the result in batches via an odbc cursor and accumulates rows, so the
 * driver never allocates one giant buffer. Returns the same full array shape.
 *
 * Acquires a dedicated pooled connection (a cursor holds its connection open
 * until closed), and always releases it.
 *
 * @param {string} sql
 * @param {Array}  params
 * @param {object} pool   odbc pool (defaults to IPS)
 * @param {number} fetchSize rows per batch
 * @returns {Promise<Array<object>>}
 */
async function executeQueryLarge(sql, params = [], pool = null, fetchSize = CURSOR_FETCH_SIZE) {
  const activePool = pool || (await getPool());
  let connection;
  let cursor;
  try {
    connection = await activePool.connect();
    cursor = await connection.query(sql, params, { cursor: true, fetchSize });
    const all = [];
    // Fetch batches until the cursor reports no more data.
    // (cursor.fetch() returns an array-like batch; noData flips true at the end.)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await cursor.fetch();
      const rows = toRows(batch);
      if (rows.length) all.push(...rows);
      if (cursor.noData || rows.length === 0) break;
    }
    return all;
  } catch (err) {
    logger.error(`[db] executeQueryLarge failed: ${err.message} :: ${sql} :: params=${JSON.stringify(params)}`);
    throw err;
  } finally {
    try { if (cursor) await cursor.close(); } catch (e) { /* ignore */ }
    try { if (connection) await connection.close(); } catch (e) { /* ignore */ } // returns conn to pool
  }
}

/** LEGACY-PARITY (swallow→[]) variant of executeQueryLarge. */
async function executeQueryLargeSafe(sql, params = [], pool = null, fetchSize = CURSOR_FETCH_SIZE) {
  try {
    return await executeQueryLarge(sql, params, pool, fetchSize);
  } catch (err) {
    recordSwallowed('executeQueryLargeSafe', sql, params, err);
    return [];
  }
}

/** Cursor-based stored-proc call (swallow→[] by default, like callProc). */
async function callProcLarge(spName, params = [], pool = null, opts = {}) {
  const sql = callSql(spName, params.length);
  return opts.strict
    ? executeQueryLarge(sql, params, pool)
    : executeQueryLargeSafe(sql, params, pool);
}

/**
 * Build a `CALL sp(?, ?, ...)` string for N params. Helper so repositories
 * never hand-build placeholder lists.
 * @param {string} spName
 * @param {number} paramCount
 */
function callSql(spName, paramCount) {
  if (!paramCount) return `CALL ${spName}()`;
  const placeholders = new Array(paramCount).fill('?').join(', ');
  return `CALL ${spName}(${placeholders})`;
}

/**
 * LEGACY-PARITY variant of executeQuery. The .NET HelperEntityMap.ExecuteQuery<T>
 * swallowed ALL errors and returned an empty list (so datasync endpoints
 * returned [] / HTTP 200 instead of 500). Used by the datasync repositories to
 * preserve drop-in behavior; the strict `executeQuery` (which propagates) is
 * used by core/Phase-4 routes where real errors should surface.
 * @returns {Promise<Array<object>>} [] on error
 */
async function executeQuerySafe(sql, params = [], pool = null) {
  try {
    return await executeQuery(sql, params, pool);
  } catch (err) {
    // Legacy parity: return [] so the consumer never sees a 500. But this is a
    // real failure — record + log it loudly (H1/H5) so it is never invisible.
    recordSwallowed('executeQuerySafe', sql, params, err);
    return [];
  }
}

/**
 * Convenience: call a stored proc by name with an ordered params array.
 * Defaults to the LEGACY-PARITY (swallowing) behavior, matching the .NET data
 * layer — datasync repos rely on this. Pass {strict:true} to propagate errors
 * (core/Phase-4 routes use the strict path).
 * @returns {Promise<Array<object>>}
 */
async function callProc(spName, params = [], pool = null, opts = {}) {
  const sql = callSql(spName, params.length);
  return opts.strict ? executeQuery(sql, params, pool) : executeQuerySafe(sql, params, pool);
}

// --- Single-value helpers (mirror the C# HelperEntityMap variants) ----------
// All swallow errors and return a default, exactly like the C# helpers
// (ExecuteQueryGetString / ...CheckRecordExists / ...GreaterThanZero).

/** First column of the first row as a string ("" if none/error). (≈ ExecuteQueryGetString) */
async function getString(sql, params = [], pool = null) {
  const rows = await executeQuerySafe(sql, params, pool);
  if (!rows.length) return '';
  const v = Object.values(rows[0])[0];
  return v === null || v === undefined ? '' : String(v);
}

/** Second column of the first row as a string ("" if none/error). (≈ ExecuteQueryGetSpecificColumn) */
async function getSpecificColumn(sql, params = [], pool = null) {
  const rows = await executeQuerySafe(sql, params, pool);
  if (!rows.length) return '';
  const vals = Object.values(rows[0]);
  const v = vals.length > 1 ? vals[1] : undefined;
  return v === null || v === undefined ? '' : String(v);
}

/** True if the query returns at least one row (false on error). (≈ ExecuteQueryCheckRecordExists) */
async function recordExists(sql, params = [], pool = null) {
  const rows = await executeQuerySafe(sql, params, pool);
  return rows.length > 0;
}

/** True if the first column of the first row, as an integer, is > 0 (false on error). (≈ ExecuteQueryCheckRecordGreaterThanZero) */
async function recordGtZero(sql, params = [], pool = null) {
  const rows = await executeQuerySafe(sql, params, pool);
  if (!rows.length) return false;
  const v = parseInt(Object.values(rows[0])[0], 10);
  return Number.isFinite(v) && v > 0;
}

/**
 * Connectivity + execution health check. Runs three escalating probes against
 * the IPS pool and returns a structured result (never throws):
 *   1. pool      — can we acquire/create the pool?
 *   2. select1   — does a trivial query execute? (SELECT 1)
 *   3. tableRead — does a real table read work? (SELECT TOP n FROM dba.facility_fill_type)
 * Used by the status page on `/`.
 */
async function checkConnection() {
  const started = Date.now();
  const checks = {
    pool: { ok: false, ms: null, detail: null },
    select1: { ok: false, ms: null, detail: null },
    tableRead: { ok: false, ms: null, detail: null, rowCount: null },
  };

  // 1) pool
  let t = Date.now();
  let pool;
  try {
    pool = await getPool();
    checks.pool.ok = true;
    checks.pool.ms = Date.now() - t;
  } catch (err) {
    checks.pool.ms = Date.now() - t;
    checks.pool.detail = err.message;
    return finalize(checks, started); // can't go further without a pool
  }

  // 2) SELECT 1 — go through executeQuery (same path as every working endpoint).
  // NOTE: call pool.query with an explicit params array ([]); the SQL Anywhere
  // ODBC driver errors on a bare query(sql) with no params arg.
  t = Date.now();
  try {
    const rows = await executeQuery('SELECT 1 AS ok', [], pool);
    checks.select1.ok = Array.isArray(rows) && rows.length > 0;
    checks.select1.ms = Date.now() - t;
    if (!checks.select1.ok) checks.select1.detail = 'no rows returned';
  } catch (err) {
    checks.select1.ms = Date.now() - t;
    checks.select1.detail = err.message;
  }

  // 3) real table read (basic syntax + execution, like the scaffold sample)
  t = Date.now();
  try {
    const rows = await executeQuery('SELECT TOP 5 * FROM dba.facility_fill_type', [], pool);
    checks.tableRead.ok = Array.isArray(rows);
    checks.tableRead.ms = Date.now() - t;
    checks.tableRead.rowCount = Array.isArray(rows) ? rows.length : null;
  } catch (err) {
    checks.tableRead.ms = Date.now() - t;
    checks.tableRead.detail = err.message;
  }

  return finalize(checks, started);
}

function finalize(checks, started) {
  const ok = Object.values(checks).every((c) => c.ok);
  return {
    ok,
    checks,
    swallowedErrors: getSwallowedErrorStats(),
    totalMs: Date.now() - started,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  executeQuery,
  executeQuerySafe,
  executeQueryLarge,
  executeQueryLargeSafe,
  callProc,
  callProcLarge,
  callSql,
  getString,
  getSpecificColumn,
  recordExists,
  recordGtZero,
  checkConnection,
  getSwallowedErrorStats,
  resetSwallowedErrorStats,
  recordSwallowed,
};
