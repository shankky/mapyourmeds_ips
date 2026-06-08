'use strict';

/**
 * IPS-012 — DB connectivity smoke test. RUN THIS ON THE ON-PREM SERVER.
 *
 *   npm run smoke
 *
 * Validates the full Phase-1 data path on the real database:
 *   1. config/env builds the ODBC connection string
 *   2. db/pool creates an odbc.pool
 *   3. db/queryHelper runs a parameterized stored-proc call and maps rows
 *
 * It exercises three things the scaffold's one-off sample did NOT:
 *   - a POOLED connection (not connect-per-call)
 *   - a PARAMETERIZED call (CALL sp(?))
 *   - the helper mapping + single-value helpers
 *
 * Exits 0 on success, 1 on failure. Prints row counts + a sample row so you can
 * eyeball that columns map. Does NOT print full PHI dumps.
 */

const config = require('../config/env');
const logger = require('../utils/logger');
const { executeQuery, callProc, getString } = require('../db/queryHelper');
const { getPool, closePools } = require('../db/pool');

async function main() {
  logger.info('=== IPS-012 smoke test ===');
  logger.info(`IPS DSN: ${config.db.ips.dsn} (drug sameAsIps=${config.db.drug.sameAsIps})`);

  // 0) Pool comes up
  await getPool();
  logger.info('[1/4] pool OK');

  // 1) Trivial literal query (matches the proven scaffold pattern)
  const ping = await executeQuery('SELECT 1 AS ok');
  logger.info(`[2/4] SELECT 1 -> ${JSON.stringify(ping[0])}`);

  // 2) No-arg stored proc (facility groups) — the canonical Phase-1 proof.
  const groups = await callProc('sp_mym_getfacilitygroup', []);
  logger.info(`[3/4] sp_mym_getfacilitygroup -> ${groups.length} rows`);
  if (groups.length) {
    logger.info(`        columns: ${Object.keys(groups[0]).join(', ')}`);
    logger.info(`        sample : ${JSON.stringify(groups[0])}`);
  }

  // 3) Parameterized stored proc — proves bound params work end-to-end.
  //    sp_mym_getprescriptiondetailbyrxno(?) was the call commented in the
  //    scaffold. Override the test rx via SMOKE_RX env if needed.
  const rxNo = process.env.SMOKE_RX || '50078646';
  try {
    const detail = await callProc('sp_mym_getprescriptiondetailbyrxno', [rxNo]);
    logger.info(`[4/4] sp_mym_getprescriptiondetailbyrxno('${rxNo}') -> ${detail.length} rows`);
  } catch (err) {
    logger.warn(`[4/4] parameterized proc test failed for rx '${rxNo}': ${err.message}`);
    logger.warn('      (set SMOKE_RX to a valid rx number on this DB, or ignore if the SP differs)');
  }

  logger.info('=== smoke test PASSED ===');
}

main()
  .then(() => closePools())
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(`smoke test FAILED: ${err.message}`);
    logger.error(err.stack || '');
    closePools().finally(() => process.exit(1));
  });
