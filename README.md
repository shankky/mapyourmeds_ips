# mapyourmeds_ips

Express.js port of the IPS / SuiteRx pharmacy API (originally ASP.NET Web API 2 →
Sybase SQL Anywhere). Connects to SQL Anywhere via **ODBC** and exposes the same
HTTP contract the existing consumer (`mym/config/ips.class.js`) depends on.

> **Runs on the client's on-prem server only** — that's the only place the SQL
> Anywhere database / ODBC DSN is reachable. It cannot run in the dev environment.

Full design + task plan: see `dev_plan/060426_ips_expressjs_port_dev_plan.md` and the
`memory-bank/` in the source repo (`d:\aws_repos\ips_mainNew`).

## Status

- **Phase 1 — Skeleton & DB connectivity: COMPLETE** (pending on-server smoke test).
- Phase 2 (consumer-critical endpoints) is next.

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
curl http://localhost:3000/health
```

## Project layout (Phase 1)

```
config/env.js          # loads .env, builds ODBC connection string, all config
db/pool.js             # odbc.pool (ips + drug); getPool() / getDrugPool()
db/queryHelper.js      # parameterized executeQuery, callProc, callSql + helpers
utils/logger.js        # structured console logger (replaces Logger.cs)
utils/phone.js         # formatPhone / formatFax (mirror .NET BO mappers)
middleware/errorHandler.js  # JSON 404 + central error handler
routes/datasync/       # MetizDatasyncAPI-equivalent routers (filled in Phase 2/3)
routes/core/           # SuiterxWebAPI-equivalent routers (Phase 4)
repositories/          # one fn per stored proc (Phase 2+)
mappers/               # BO response mappers (Phase 4)
scripts/smoke-test.js  # IPS-012 connectivity check
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
