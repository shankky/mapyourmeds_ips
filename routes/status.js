'use strict';

/**
 * Status page mounted at `/`.
 *
 * Live-checks DB connectivity + execution (pool → SELECT 1 → real table read on
 * dba.facility_fill_type, mirroring the scaffold sample). Renders a self-contained
 * HTML dashboard with status symbols in a browser, or JSON when requested
 * (`Accept: application/json` or `?format=json`) for monitoring/curl.
 *
 * GET /            → status dashboard
 * GET /?format=json → JSON status (also at /health for a lightweight liveness ping)
 */

const express = require('express');
const router = express.Router();
const { checkConnection } = require('../db/queryHelper');
const config = require('../config/env');

const SYM_OK = '✅';   // ✅
const SYM_BAD = '❌';  // ❌
const SYM_NA = '⚪';   // ⚪

function rowHtml(label, check) {
  const sym = check.ok ? SYM_OK : (check.detail || check.ms !== null ? SYM_BAD : SYM_NA);
  const ms = check.ms !== null && check.ms !== undefined ? `${check.ms} ms` : '—';
  const extra = [];
  if (check.rowCount !== null && check.rowCount !== undefined) extra.push(`${check.rowCount} rows`);
  if (check.detail) extra.push(`<span class="err">${escapeHtml(check.detail)}</span>`);
  return `<tr>
    <td class="sym">${sym}</td>
    <td class="lbl">${escapeHtml(label)}</td>
    <td class="ms">${ms}</td>
    <td class="detail">${extra.join(' · ') || '<span class="ok">OK</span>'}</td>
  </tr>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderHtml(status) {
  const overall = status.ok ? `${SYM_OK} HEALTHY` : `${SYM_BAD} DEGRADED`;
  const overallClass = status.ok ? 'healthy' : 'degraded';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>mapyourmeds_ips — status</title>
  <meta http-equiv="refresh" content="15" />
  <style>
    :root { color-scheme: light dark; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
           margin: 0; padding: 2rem; background: #0f1115; color: #e6e6e6; }
    .card { max-width: 760px; margin: 0 auto; background: #161a22; border: 1px solid #262c38;
            border-radius: 12px; padding: 1.5rem 1.75rem; box-shadow: 0 6px 24px rgba(0,0,0,.3); }
    h1 { font-size: 1.15rem; margin: 0 0 .25rem; }
    .sub { color: #8b94a7; font-size: .82rem; margin-bottom: 1.25rem; }
    .badge { display: inline-block; font-weight: 700; padding: .35rem .8rem; border-radius: 999px;
             font-size: .95rem; margin-bottom: 1.25rem; }
    .badge.healthy { background: #10301c; color: #5ad17f; border: 1px solid #1f6b3c; }
    .badge.degraded { background: #3a1416; color: #ff8a8a; border: 1px solid #7a2326; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    td { padding: .55rem .4rem; border-bottom: 1px solid #232936; vertical-align: top; }
    td.sym { width: 1.6rem; font-size: 1.05rem; }
    td.lbl { font-weight: 600; white-space: nowrap; }
    td.ms { color: #8b94a7; white-space: nowrap; text-align: right; width: 5rem; }
    .err { color: #ff8a8a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .82rem; }
    .ok { color: #5ad17f; }
    .meta { margin-top: 1.25rem; color: #6b7383; font-size: .78rem; line-height: 1.6; }
    code { background: #0f1115; padding: .1rem .35rem; border-radius: 5px; }
    a { color: #6ea8fe; }
  </style>
</head>
<body>
  <div class="card">
    <h1>mapyourmeds_ips API</h1>
    <div class="sub">IPS / SuiteRx Express port · env <code>${escapeHtml(config.env)}</code> · auto-refreshes every 15s</div>
    <div class="badge ${overallClass}">${overall}</div>
    <table>
      <tbody>
        ${rowHtml('1. ODBC pool', status.checks.pool)}
        ${rowHtml('2. Execute (SELECT 1)', status.checks.select1)}
        ${rowHtml('3. Table read (dba.facility_fill_type)', status.checks.tableRead)}
      </tbody>
    </table>
    <div class="meta">
      DSN: <code>${escapeHtml(config.db.ips.dsn)}</code>
      &nbsp;·&nbsp; drug pool: <code>${status && config.db.drug.sameAsIps ? 'same as IPS' : escapeHtml(config.db.drug.dsn)}</code><br/>
      total check time: ${status.totalMs} ms &nbsp;·&nbsp; checked at ${escapeHtml(status.checkedAt)}<br/>
      JSON: <a href="/?format=json">/?format=json</a> &nbsp;·&nbsp; liveness: <a href="/health">/health</a>
    </div>
  </div>
</body>
</html>`;
}

router.get('/', async (req, res, next) => {
  try {
    const status = await checkConnection();
    const wantsJson = req.query.format === 'json' ||
      (req.headers.accept || '').includes('application/json');
    if (wantsJson) {
      return res.status(status.ok ? 200 : 503).json(status);
    }
    res.status(status.ok ? 200 : 503).type('html').send(renderHtml(status));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
