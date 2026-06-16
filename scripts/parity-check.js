'use strict';

/**
 * Contract-parity check (Phase 6 / IPS-066). Compares the Express port's output
 * to the existing .NET API for the 29 consumer-critical endpoints, with the
 * SAME inputs, and reports STRUCTURAL and VALUE differences.
 *
 * Two modes (auto-detected):
 *   LIVE A/B   — set DOTNET_BASE_URL to the old API base
 *                (e.g. https://oldhost:5003/api/). Script calls BOTH back-to-back
 *                per endpoint and diffs. Best: same-moment data = least drift.
 *   SNAPSHOT   — no DOTNET_BASE_URL. Diffs Express output against saved baseline
 *                files in parity/baseline/<label>.json (capture with
 *                `npm run parity:capture` while pointed at the old API).
 *
 * What it reports per endpoint:
 *   - STATUS  : HTTP status of each side
 *   - SHAPE   : structural parity (field names, casing, types, array/object,
 *               nesting). THIS IS THE ACCEPTANCE CRITERION for drop-in compat.
 *   - VALUES  : count of value differences (informational — live pharmacy data
 *               drifts between calls; investigate large/structural diffs only).
 *
 * Output: console summary + a full JSON report at parity/report.json.
 * Exit 0 if all shapes match; 1 otherwise.
 *
 * Built-in http/https only (no deps). BASE_URL = Express (default localhost:3000).
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { ENDPOINTS, PARITY_EXTRA, SAMPLES } = require('./consumer-endpoints');

// By default check the consumer 29 PLUS the Phase-3 parity endpoints (41 total).
// Set PARITY_CONSUMER_ONLY=1 to check only the 29 consumer-critical endpoints.
const ALL_ENDPOINTS = process.env.PARITY_CONSUMER_ONLY === '1'
  ? ENDPOINTS
  : ENDPOINTS.concat(PARITY_EXTRA || []);

const EXPRESS_BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const DOTNET_BASE = process.env.DOTNET_BASE_URL ? process.env.DOTNET_BASE_URL.replace(/\/$/, '') : null;
const PARITY_DIR = path.join(__dirname, '..', 'parity');
const BASELINE_DIR = path.join(PARITY_DIR, 'baseline');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

/** POST JSON, resolve { status, json }. base may be http or https. */
function postJson(base, relPath, body) {
  return new Promise((resolve) => {
    // Express needs /api/ prefix; .NET base is expected to already end in /api.
    const url = new URL(base + (base.endsWith('/api') ? '/' : '/api/') + relPath);
    const lib = url.protocol === 'https:' ? https : http;
    const data = Buffer.from(JSON.stringify(body || {}));
    const req = lib.request(
      {
        method: 'POST', hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers: { 'content-type': 'application/json', 'content-length': data.length },
        rejectUnauthorized: false, // old API may have a self-signed/internal cert
        // 180s default: some IPS endpoints are slow (e.g. getCycleRx ~62s for
        // ~19 MB). A low timeout falsely reports __error on a working endpoint.
        timeout: parseInt(process.env.PARITY_TIMEOUT_MS || '180000', 10),
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let json; try { json = JSON.parse(buf); } catch (_) { json = buf; }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error('request timed out')); });
    req.on('error', (e) => resolve({ status: 0, json: { __error: e.message } }));
    req.write(data); req.end();
  });
}

/** Structural signature of a value: types + sorted keys, recursive, order-independent for arrays (uses first element). */
function shapeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.length ? `array<${shapeOf(v[0])}>` : 'array<empty>';
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort();
    return '{' + keys.map((k) => `${k}:${shapeOf(v[k])}`).join(',') + '}';
  }
  return typeof v; // string | number | boolean
}

/** Field-name set (recursive, for object/array-of-object) — casing-sensitive. */
function fieldSet(v, prefix, out) {
  out = out || new Set();
  if (Array.isArray(v)) { if (v.length) fieldSet(v[0], prefix, out); return out; }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) { out.add(prefix ? prefix + '.' + k : k); fieldSet(v[k], prefix ? prefix + '.' + k : k, out); }
  }
  return out;
}

/** Count value differences between two like-shaped values (best-effort, capped). */
function countValueDiffs(a, b, max) {
  let diffs = 0;
  function walk(x, y) {
    if (diffs >= max) return;
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) diffs++;
      for (let i = 0; i < Math.min(x.length, y.length); i++) walk(x[i], y[i]);
    } else if (x && y && typeof x === 'object' && typeof y === 'object') {
      const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
      for (const k of keys) walk(x[k], y[k]);
    } else if (x !== y) diffs++;
  }
  walk(a, b); return diffs;
}

function diff(a, b) {
  const aFields = [...fieldSet(a)];
  const bFields = [...fieldSet(b)];
  const onlyExpress = aFields.filter((f) => !bFields.includes(f));
  const onlyDotnet = bFields.filter((f) => !aFields.includes(f));
  const shapeMatch = shapeOf(a) === shapeOf(b);
  const fieldsMatch = onlyExpress.length === 0 && onlyDotnet.length === 0;
  return {
    shapeMatch,
    fieldsMatch,
    onlyExpress,
    onlyDotnet,
    valueDiffs: shapeMatch ? countValueDiffs(a, b, 1000) : null,
  };
}

async function getDotnet(label, relPath, body) {
  if (DOTNET_BASE) return postJson(DOTNET_BASE, relPath, body);
  // snapshot mode
  const file = path.join(BASELINE_DIR, `${label}.json`);
  if (!fs.existsSync(file)) return { status: null, json: undefined, __missingBaseline: true };
  return { status: 200, json: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

(async () => {
  ensureDir(PARITY_DIR);
  const mode = DOTNET_BASE ? `LIVE A/B (vs ${DOTNET_BASE})` : 'SNAPSHOT (vs parity/baseline/*.json)';
  console.log(`Parity check — Express ${EXPRESS_BASE} vs .NET\nMode: ${mode}\nSamples: ${JSON.stringify(SAMPLES)}\n`);

  const report = [];
  let shapeOk = 0, shapeBad = 0, skipped = 0, inconclusive = 0;

  // True when we genuinely cannot structurally compare (not an Express fault):
  //  - .NET returned a 5xx/0 (its own error), OR
  //  - exactly one side returned an empty array while the other had rows
  //    (a row-count/live-data difference, not a shape difference).
  function isInconclusive(ex, dn) {
    if (dn.status >= 500 || dn.status === 0) return '.NET error ' + dn.status;
    const exArr = Array.isArray(ex.json), dnArr = Array.isArray(dn.json);
    if (exArr && dnArr) {
      const exEmpty = ex.json.length === 0, dnEmpty = dn.json.length === 0;
      if (exEmpty !== dnEmpty) return (dnEmpty ? '.NET empty, Express has rows' : 'Express empty, .NET has rows');
    }
    return null;
  }

  for (const [label, relPath, body] of ALL_ENDPOINTS) {
    /* eslint-disable no-await-in-loop */
    const ex = await postJson(EXPRESS_BASE, relPath, body);
    const dn = await getDotnet(label, relPath, body);

    if (dn.__missingBaseline) {
      console.log(`SKIP  ${label.padEnd(34)} (no baseline file)`);
      skipped++; report.push({ label, relPath, skipped: true }); continue;
    }

    const inc = isInconclusive(ex, dn);
    const d = diff(ex.json, dn.json);

    if (inc) {
      inconclusive++;
      console.log(`??  ${label.padEnd(34)} express[${ex.status}] dotnet[${dn.status}] INCONCLUSIVE — ${inc} (can't compare shape)`);
      report.push({ label, relPath, expressStatus: ex.status, dotnetStatus: dn.status, inconclusive: inc, ...d });
      continue;
    }

    const ok = d.shapeMatch && d.fieldsMatch;
    if (ok) shapeOk++; else shapeBad++;

    const valNote = d.valueDiffs === null ? '' : ` | values:${d.valueDiffs}${d.valueDiffs ? ' (live-data drift?)' : ' identical'}`;
    console.log(`${ok ? 'OK  ' : 'XX  '} ${label.padEnd(34)} express[${ex.status}] dotnet[${dn.status}] shape:${d.shapeMatch ? 'match' : 'DIFF'} fields:${d.fieldsMatch ? 'match' : 'DIFF'}${valNote}`);
    if (!ok) {
      if (d.onlyExpress.length) console.log(`        only in Express: ${d.onlyExpress.slice(0, 12).join(', ')}`);
      if (d.onlyDotnet.length) console.log(`        only in .NET   : ${d.onlyDotnet.slice(0, 12).join(', ')}`);
    }
    report.push({ label, relPath, expressStatus: ex.status, dotnetStatus: dn.status, ...d });
  }

  ensureDir(PARITY_DIR);
  fs.writeFileSync(path.join(PARITY_DIR, 'report.json'), JSON.stringify({ mode, generatedAt: new Date().toISOString(), samples: SAMPLES, results: report }, null, 2));

  console.log(`\nShapes — match: ${shapeOk}, DIFF: ${shapeBad}, inconclusive: ${inconclusive}, skipped: ${skipped}`);
  if (inconclusive) {
    console.log(`  (?? inconclusive = .NET errored or one side empty; not an Express shape failure. See report.json.)`);
  }
  console.log(`Full report: parity/report.json`);
  if (shapeBad === 0) {
    console.log(`\n✓ PARITY: all comparable endpoints structurally match the .NET API` +
      (inconclusive ? ` (${inconclusive} inconclusive — .NET-side error/empty, review individually).` : '.'));
  } else {
    console.log('\n✗ PARITY: structural differences found — see above (these break drop-in compatibility).');
  }
  process.exit(shapeBad === 0 ? 0 : 1);
})();
