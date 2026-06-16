'use strict';

/**
 * Diagnostic probe for sp_mym_getcyclerx_status — RUN ON THE SERVER.
 *
 *   node --max-old-space-size=4096 scripts/probe-cyclerx.js
 *
 * Tests multiple fetch strategies directly against the DB to find one that can
 * pull this large (~15 MB) result set, since:
 *   - buffered query()  -> "Error allocating or reallocating memory" (earlier)
 *   - cursor fetch      -> "Error fetching results with SQLFetch" (now)
 *
 * Prints, for each strategy: ok/fail, rows, ms, and the error if any.
 * No app server needed; uses the pool directly.
 */

const { getPool } = require('../db/pool');
const SQL = 'CALL sp_mym_getcyclerx_status()';

function ms(t) { return (Date.now() - t) + 'ms'; }

async function tryBuffered(pool) {
  const t = Date.now();
  try {
    const r = await pool.query(SQL, []);
    return { strategy: 'buffered query()', ok: true, rows: Array.from(r).length, time: ms(t) };
  } catch (e) {
    return { strategy: 'buffered query()', ok: false, error: e.message, time: ms(t) };
  }
}

async function tryCursor(pool, fetchSize) {
  const t = Date.now();
  let conn, cursor;
  try {
    conn = await pool.connect();
    cursor = await conn.query(SQL, [], { cursor: true, fetchSize });
    let n = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = Array.from(await cursor.fetch());
      n += batch.length;
      if (cursor.noData || batch.length === 0) break;
    }
    return { strategy: `cursor fetchSize=${fetchSize}`, ok: true, rows: n, time: ms(t) };
  } catch (e) {
    return { strategy: `cursor fetchSize=${fetchSize}`, ok: false, error: e.message, time: ms(t) };
  } finally {
    try { if (cursor) await cursor.close(); } catch (_) {}
    try { if (conn) await conn.close(); } catch (_) {}
  }
}

(async () => {
  console.log('Probing', SQL);
  console.log('Node heap limit:', Math.round(require('v8').getHeapStatistics().heap_size_limit / 1048576), 'MB\n');
  const pool = await getPool();

  const results = [];
  results.push(await tryBuffered(pool));
  results.push(await tryCursor(pool, 1));     // smallest possible — isolates SQLFetch-mode issue
  results.push(await tryCursor(pool, 100));
  results.push(await tryCursor(pool, 500));

  console.log('\n=== RESULTS ===');
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.strategy.padEnd(22)} ${r.ok ? r.rows + ' rows' : r.error} (${r.time})`);
  }
  console.log('\nTip: re-run with `node --max-old-space-size=4096 scripts/probe-cyclerx.js` to test if a bigger heap lets buffered succeed.');
  process.exit(0);
})().catch((e) => { console.error('probe fatal:', e.message); process.exit(1); });
