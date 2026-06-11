'use strict';

/**
 * Startup DB self-test (H2 hardening).
 *
 * Runs the SAME code path live traffic uses (executeQuery / callProc) against
 * the real database at boot:
 *   1. SELECT 1          — driver can execute a statement
 *   2. canonical SP call — a real stored proc returns rows (sp_mym_getfacilitygroup)
 *
 * Why: the datasync layer returns []/200 on query errors (legacy parity), so a
 * deploy where the DB is unreachable or the driver is misconfigured would
 * SILENTLY serve empty data. This self-test makes that failure loud at boot.
 *
 * Behavior controlled by env:
 *   STARTUP_DB_SELFTEST = 1|0   (default 1) — run the test at boot
 *   STARTUP_DB_FAIL_FAST = 1|0  (default: 1 in production, else 0) — exit(1) on failure
 *
 * In fail-fast mode a failing self-test refuses to start the server, so a bad
 * deploy is caught immediately instead of quietly returning empty results.
 */

const { executeQuery, callProc } = require('./queryHelper');
const logger = require('../utils/logger');

const CANONICAL_SP = process.env.STARTUP_SELFTEST_SP || 'sp_mym_getfacilitygroup';

async function runSelfTest() {
  const result = { ok: false, steps: {}, startedAt: new Date().toISOString() };

  // 1) SELECT 1
  try {
    const rows = await executeQuery('SELECT 1 AS ok', []);
    result.steps.select1 = { ok: Array.isArray(rows) && rows.length > 0 };
    if (!result.steps.select1.ok) result.steps.select1.detail = 'no rows';
  } catch (err) {
    result.steps.select1 = { ok: false, detail: err.message };
  }

  // 2) canonical stored proc (strict — we WANT the error here, not a swallow)
  try {
    const rows = await callProc(CANONICAL_SP, [], null, { strict: true });
    result.steps.canonicalSp = { ok: Array.isArray(rows), rowCount: Array.isArray(rows) ? rows.length : null, sp: CANONICAL_SP };
  } catch (err) {
    result.steps.canonicalSp = { ok: false, detail: err.message, sp: CANONICAL_SP };
  }

  result.ok = Object.values(result.steps).every((s) => s.ok);
  return result;
}

/**
 * Run the self-test at boot. Resolves true if healthy. In fail-fast mode it
 * calls process.exit(1) on failure (so the server never starts degraded).
 */
async function startupSelfTest() {
  if (process.env.STARTUP_DB_SELFTEST === '0') {
    logger.warn('[selftest] DB self-test disabled (STARTUP_DB_SELFTEST=0)');
    return true;
  }

  const failFast = process.env.STARTUP_DB_FAIL_FAST !== undefined
    ? process.env.STARTUP_DB_FAIL_FAST === '1'
    : process.env.NODE_ENV === 'production';

  logger.info('[selftest] running startup DB self-test...');
  let result;
  try {
    result = await runSelfTest();
  } catch (err) {
    result = { ok: false, steps: { fatal: { ok: false, detail: err.message } } };
  }

  if (result.ok) {
    const rc = result.steps.canonicalSp && result.steps.canonicalSp.rowCount;
    logger.info(`[selftest] PASSED — SELECT 1 ok, ${CANONICAL_SP} -> ${rc} rows`);
    return true;
  }

  logger.error(`[selftest] FAILED: ${JSON.stringify(result.steps)}`);
  if (failFast) {
    logger.error('[selftest] STARTUP_DB_FAIL_FAST is on — refusing to start with a degraded DB. Exiting(1).');
    process.exit(1);
  } else {
    logger.error('[selftest] fail-fast OFF — server will start DEGRADED. Fix the DB before serving traffic.');
    return false;
  }
}

module.exports = { startupSelfTest, runSelfTest };
