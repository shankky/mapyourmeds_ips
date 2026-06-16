'use strict';

/**
 * Capture .NET API responses into parity/baseline/<label>.json (for SNAPSHOT
 * parity mode, when you can't reach both APIs at the same time).
 *
 *   DOTNET_BASE_URL=https://mymsync.mapyourmedsapi.com:5003 npm run parity:capture
 *
 * Then later, without DOTNET_BASE_URL set, `npm run parity` diffs the live
 * Express output against these saved files.
 *
 * If you CAN reach both at once, skip this and just run `npm run parity` with
 * DOTNET_BASE_URL set (LIVE A/B mode) — that's more accurate (same-moment data).
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { ENDPOINTS } = require('./consumer-endpoints');

const DOTNET_BASE = (process.env.DOTNET_BASE_URL || '').replace(/\/$/, '');
if (!DOTNET_BASE) {
  console.error('Set DOTNET_BASE_URL (e.g. https://mymsync.mapyourmedsapi.com:5003) before capturing.');
  process.exit(1);
}

const BASELINE_DIR = path.join(__dirname, '..', 'parity', 'baseline');
if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });

function postJson(base, relPath, body) {
  return new Promise((resolve) => {
    const url = new URL(base + (base.endsWith('/api') ? '/' : '/api/') + relPath);
    const lib = url.protocol === 'https:' ? https : http;
    const data = Buffer.from(JSON.stringify(body || {}));
    const req = lib.request(
      { method: 'POST', hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, headers: { 'content-type': 'application/json', 'content-length': data.length }, rejectUnauthorized: false, timeout: parseInt(process.env.PARITY_TIMEOUT_MS || '180000', 10) },
      (res) => { let buf = ''; res.on('data', (c) => (buf += c)); res.on('end', () => { let j; try { j = JSON.parse(buf); } catch (_) { j = buf; } resolve({ status: res.statusCode, json: j }); }); }
    );
    req.on('timeout', () => { req.destroy(new Error('request timed out')); });
    req.on('error', (e) => resolve({ status: 0, json: { __error: e.message } }));
    req.write(data); req.end();
  });
}

(async () => {
  console.log(`Capturing .NET baselines from ${DOTNET_BASE} -> parity/baseline/\n`);
  let ok = 0;
  for (const [label, relPath, body] of ENDPOINTS) {
    /* eslint-disable no-await-in-loop */
    const r = await postJson(DOTNET_BASE, relPath, body);
    fs.writeFileSync(path.join(BASELINE_DIR, `${label}.json`), JSON.stringify(r.json, null, 2));
    const n = Array.isArray(r.json) ? `array[${r.json.length}]` : typeof r.json;
    console.log(`  [${String(r.status).padStart(3)}] ${label.padEnd(34)} -> ${n}`);
    if (r.status >= 200 && r.status < 300) ok++;
  }
  console.log(`\nCaptured ${ENDPOINTS.length} baselines (${ok} returned 2xx). Now run \`npm run parity\` (without DOTNET_BASE_URL) to diff.`);
})();
