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
 * Convenience: call a stored proc by name with an ordered params array.
 * @returns {Promise<Array<object>>}
 */
async function callProc(spName, params = [], pool = null) {
  return executeQuery(callSql(spName, params.length), params, pool);
}

// --- Single-value helpers (mirror the C# HelperEntityMap variants) ----------

/** First column of the first row as a string ("" if none). (≈ ExecuteQueryGetString) */
async function getString(sql, params = [], pool = null) {
  const rows = await executeQuery(sql, params, pool);
  if (!rows.length) return '';
  const first = rows[0];
  const v = Object.values(first)[0];
  return v === null || v === undefined ? '' : String(v);
}

/** Second column of the first row as a string ("" if none). (≈ ExecuteQueryGetSpecificColumn) */
async function getSpecificColumn(sql, params = [], pool = null) {
  const rows = await executeQuery(sql, params, pool);
  if (!rows.length) return '';
  const vals = Object.values(rows[0]);
  const v = vals.length > 1 ? vals[1] : undefined;
  return v === null || v === undefined ? '' : String(v);
}

/** True if the query returns at least one row. (≈ ExecuteQueryCheckRecordExists) */
async function recordExists(sql, params = [], pool = null) {
  const rows = await executeQuery(sql, params, pool);
  return rows.length > 0;
}

/** True if the first column of the first row, as an integer, is > 0. (≈ ExecuteQueryCheckRecordGreaterThanZero) */
async function recordGtZero(sql, params = [], pool = null) {
  const rows = await executeQuery(sql, params, pool);
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

  // 2) SELECT 1
  t = Date.now();
  try {
    const rows = await pool.query('SELECT 1 AS ok');
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
    const rows = await pool.query('SELECT TOP 5 * FROM dba.facility_fill_type');
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
  return { ok, checks, totalMs: Date.now() - started, checkedAt: new Date().toISOString() };
}

module.exports = {
  executeQuery,
  callProc,
  callSql,
  getString,
  getSpecificColumn,
  recordExists,
  recordGtZero,
  checkConnection,
};
