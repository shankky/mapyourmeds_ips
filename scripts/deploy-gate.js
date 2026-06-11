'use strict';

/**
 * Deploy gate (H6 hardening). RUN AGAINST A RUNNING SERVER ON THE TARGET HOST
 * as the final check before sending real traffic:
 *
 *   npm start                 # in one terminal
 *   npm run deploy:gate       # in another (or in your deploy pipeline)
 *
 * Fails (exit 1) unless ALL of:
 *   1. /health/deep is healthy (pool + SELECT 1 + real table read), AND
 *      zero swallowed DB errors since boot.
 *   2. Every consumer-critical endpoint returns 2xx (delegates to
 *      smoke-endpoints.js).
 *   3. /health/deep STILL shows zero swallowed errors after the smoke run —
 *      catches endpoints that returned []/200 by swallowing a DB error.
 *
 * Step 3 is the key anti-silent-failure check: a datasync endpoint can return
 * 200 with [] even when its stored proc errored. Comparing the swallowed-error
 * counter before/after the smoke run surfaces exactly that.
 *
 * No external deps (built-in http only).
 */

const http = require('http');
const { URL } = require('url');
const { spawnSync } = require('child_process');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function getJson(pathname) {
  return new Promise((resolve) => {
    const u = new URL(pathname, BASE_URL);
    http.get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { Accept: 'application/json' } }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let body = null;
        try { body = JSON.parse(buf); } catch (_) { /* leave null */ }
        resolve({ status: res.statusCode, body });
      });
    }).on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
  });
}

function fail(msg) {
  console.error(`\n✗ DEPLOY GATE FAILED: ${msg}`);
  process.exit(1);
}

(async () => {
  console.log(`Deploy gate against ${BASE_URL}\n`);

  // 1) deep health before
  const pre = await getJson('/health/deep');
  if (pre.status !== 200 || !pre.body || pre.body.status !== 'ok') {
    fail(`/health/deep not healthy at start: HTTP ${pre.status} ${JSON.stringify(pre.body && pre.body.checks)}`);
  }
  const swallowedBefore = (pre.body.swallowedErrors && pre.body.swallowedErrors.total) || 0;
  console.log(`[1/3] /health/deep healthy (swallowed errors so far: ${swallowedBefore})`);

  // 2) endpoint smoke (delegates; inherits BASE_URL + SMK_* env)
  console.log('[2/3] running endpoint smoke...');
  const smoke = spawnSync(process.execPath, [path.join(__dirname, 'smoke-endpoints.js')], { stdio: 'inherit', env: process.env });
  if (smoke.status !== 0) fail('endpoint smoke returned non-2xx for one or more endpoints (see above)');

  // 3) deep health after — did any endpoint swallow a DB error?
  const post = await getJson('/health/deep');
  const swallowedAfter = (post.body && post.body.swallowedErrors && post.body.swallowedErrors.total) || 0;
  if (post.status !== 200 || !post.body || post.body.status !== 'ok') {
    fail(`/health/deep degraded after smoke: HTTP ${post.status}; swallowed=${swallowedAfter}`);
  }
  if (swallowedAfter > swallowedBefore) {
    const newOnes = post.body.swallowedErrors.recent || [];
    fail(`${swallowedAfter - swallowedBefore} endpoint(s) SWALLOWED a DB error (returned []/200 hiding a failure):\n` +
      newOnes.slice(0, 5).map((e) => `   - ${e.context} ${e.sql}: ${e.message}`).join('\n'));
  }
  console.log(`[3/3] no swallowed DB errors during smoke (total still ${swallowedAfter})`);

  console.log('\n✓ DEPLOY GATE PASSED — DB healthy, all endpoints 2xx, no silent failures.');
  process.exit(0);
})();
