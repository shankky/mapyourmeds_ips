# mapyourmeds_ips

Express.js port of the IPS / SuiteRx pharmacy API (originally ASP.NET Web API 2 →
Sybase SQL Anywhere). Connects to SQL Anywhere via **ODBC** and exposes the same
HTTP contract the existing consumer (`mym/config/ips.class.js`) depends on.

> **Runs on the client's on-prem server only** — that's the only place the SQL
> Anywhere database / ODBC DSN is reachable. It cannot run in the dev environment.

Deployed: **Express (new)** `http://ipsnode.mapyourmedsapi.com/` · **.NET (old)** `https://mymsync.mapyourmedsapi.com:5003`.
Contract-parity check (Express vs .NET): see `parity/README.md` and `npm run parity`.

**Deploying to a server?** Follow **`DEPLOYMENT.md`** (full production runbook: prerequisites, .env,
IIS web.config + ARR timeout, PM2, verify, rollback). IIS-specifics in `iis/README.md`.

Full design + task plan: see `dev_plan/060426_ips_expressjs_port_dev_plan.md` and the
`memory-bank/` in the source repo (`d:\aws_repos\ips_mainNew`).

## Status

- **Phase 1 — Skeleton & DB connectivity: COMPLETE & verified on server** (`npm run smoke` green).
- **Phase 2 — Consumer-critical endpoints: COMPLETE & VERIFIED ON SERVER — 29/29 endpoint smoke → 2xx**
  (all 28 endpoints the live `ips.class.js` calls, incl. the `GetDataByID` / `PrescriptionData`
  branching). The 2 initial 500s were fixed via **legacy-parity error swallowing** (the .NET data
  layer returned `[]`/`""` on query errors — preserved so the consumer never sees a 500).
- Phase 4 (auth + core host) is next; Phase 3 (remaining datasync parity) mostly already coded.

> **Error behavior (legacy parity + hardening):** datasync list/string endpoints **swallow DB/SP
> errors and return `[]`/`""` with HTTP 200** (matching the .NET `HelperEntityMap`) so the consumer
> never sees a 500. Because that can hide a real failure as "no data", every swallow is now
> **logged at ERROR level and counted** (see Operations below). Core/Phase-4 routes use the strict
> path (errors propagate). `DEBUG_ERRORS=1` surfaces `err.message` in JSON responses.

## Operations / production hardening

This is a prod-critical pharmacy API. Anti-silent-failure safeguards:

- **Startup self-test** — on boot the server runs `SELECT 1` + a canonical stored proc through the
  live code path. With `STARTUP_DB_FAIL_FAST=1` (default in production) it **refuses to start** if
  the DB is unreachable, instead of silently serving empty data.
- **`GET /health/deep`** — real DB query + swallowed-error stats; returns **503** when degraded or if
  any DB error has been swallowed since boot. **Point the load balancer health probe here**
  (`/health` is liveness-only, no DB).
- **Swallowed-error tracking** — every swallowed DB error is logged at ERROR level with full context
  and counted; the running total + recent failures show in `/health/deep` and the `/` dashboard.
- **`npm run lint:db`** — guard that fails if any raw `pool.query`/`odbc.connect` exists outside
  `db/queryHelper.js` (the one sanctioned DB path). Wire into CI.
- **`npm run deploy:gate`** — final pre-traffic check on the server: `/health/deep` healthy →
  all endpoints 2xx → swallowed-error count did not rise during the smoke. Wire into the deploy
  pipeline (run after `npm start`).

**Env flags:** `STARTUP_DB_SELFTEST` (1), `STARTUP_DB_FAIL_FAST` (prod=1), `STARTUP_SELFTEST_SP`
(`sp_mym_getfacilitygroup`), `DEBUG_ERRORS` (0). See `.env.example`.

### Verify the endpoints (on the server)

```bash
npm start                               # terminal 1
npm run smoke:endpoints                 # terminal 2 (set SMK_* env to valid IDs)
npm run routes                          # list all registered routes
```

**Postman:** import `postman/mapyourmeds_ips.postman_collection.json` (all 29 Phase-2 endpoints +
status checks). Set the `baseUrl` + sample-id collection variables, then send. See `postman/README.md`.

## Setup (on the server)

```bash
npm install                 # installs odbc + express + cors + jsonwebtoken + ...
cp .env.example .env        # then edit .env for this server's DSN/creds
```

Requirements on the box:
- Node.js (LTS) + npm
- SQL Anywhere ODBC driver + a registered DSN (e.g. `pelmeds_prod`) reachable with
  the configured UID/PWD

## Verify DB connectivity (do this first)

```bash
npm run smoke
```

`npm run smoke` (IPS-012) creates the pool, runs `SELECT 1`, calls
`sp_mym_getfacilitygroup()`, and runs a parameterized
`sp_mym_getprescriptiondetailbyrxno(?)`. It prints row counts + a sample row and
exits 0 on success. If the parameterized proc fails, set `SMOKE_RX` in `.env` to a
valid Rx number on this DB. **Get a green smoke test before building Phase 2.**

## Run

```bash
npm start          # node ./bin/www  (PORT from .env, default 3000)
```

Then open **`http://localhost:3000/`** — a live **status dashboard** that checks, with
✅/❌ symbols and timings:
1. ODBC pool comes up
2. a query executes (`SELECT 1`)
3. a real table read works (`SELECT TOP 5 * FROM dba.facility_fill_type`)

It shows `✅ HEALTHY` / `❌ DEGRADED`, auto-refreshes every 15s, and returns JSON for
monitoring at `/?format=json` (HTTP 503 when degraded). `GET /health` is a lightweight
liveness ping (no DB).

## Project layout (Phase 1)

```
config/env.js          # loads .env, builds ODBC connection string, all config
db/pool.js             # odbc.pool (ips + drug); getPool() / getDrugPool()
db/queryHelper.js      # parameterized executeQuery, callProc, callSql + helpers
utils/logger.js        # structured console logger (replaces Logger.cs)
utils/phone.js         # formatPhone / formatFax (mirror .NET BO mappers)
middleware/errorHandler.js  # JSON 404 + central error handler
middleware/asyncHandler.js  # wraps async routes -> next(err)
routes/status.js       # GET / status dashboard (live DB connectivity check)
routes/datasync/       # MetizDatasyncAPI-equivalent routers (Phase 2 done; Phase 3 parity)
routes/core/           # SuiterxWebAPI-equivalent routers (Phase 4)
repositories/          # one fn per stored proc (Phase 2+)
mappers/               # BO response mappers (Phase 4)
scripts/smoke-test.js       # IPS-012 connectivity check (npm run smoke)
scripts/smoke-endpoints.js  # hits all 28 consumer endpoints (npm run smoke:endpoints)
scripts/list-routes.js      # prints registered routes (npm run routes)
app.js  bin/www        # express app + server bootstrap (pools init/close)
```

## Conventions

- **Parameterized SQL only** — `callProc('sp_x', [a, b])` / `CALL sp_x(?, ?)`.
  Never string-concatenate inputs (the .NET original did; we don't).
- **Exact contract match** — URLs, query-param names/casing, POST verbs, and
  response field names must match the legacy API byte-for-byte (see the dev plan
  + memory-bank file 11). Don't normalize casing.
- **One ODBC pool** for all data; `getDrugPool()` aliases it unless `DRUG_DSN` is
  set separately.
- Errors are logged and propagated (never swallowed into empty results).
