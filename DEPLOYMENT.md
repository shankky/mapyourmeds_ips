# Production Deployment Runbook — mapyourmeds_ips (on-prem server)

Every server-side change required to run this Express API in production, in order. Use this as the
checklist when deploying to the **production on-prem server** (mirrors what was done on the current
`ipsnode` server).

**Topology:** IIS (reverse proxy, ARR + URL Rewrite) → PM2 (pm2-installer Windows service) → Node
(Express) on **port 3000** → ODBC → Sybase SQL Anywhere.

---

## 0. Prerequisites (one-time, on the server)

- [ ] **Node.js** (LTS) + npm installed.
- [ ] **PM2** installed as a Windows service via **pm2-installer** (runs apps on boot).
- [ ] **IIS** with **URL Rewrite** + **Application Request Routing (ARR)** modules installed
      (ARR is what proxies to Node; without it the rewrite-to-`http://localhost:3000` won't work).
- [ ] **SQL Anywhere ODBC driver** installed + the production **DSN** registered and reachable
      (test with the smoke step below). The DSN carries the Meditab connection-authentication.
- [ ] Git available (deploys are `git pull`).

---

## 1. Get the code on the server

- [ ] `git clone` (first time) or `git pull origin main` (updates) into the app folder.
- [ ] `npm install` (installs `odbc`, `express`, `cors`, `jsonwebtoken`, `uuid`, `dotenv`, `joi`, `morgan`).

---

## 2. Environment config (`.env` in the app folder)

Copy `.env.example` → `.env` and set for production. **Do NOT commit `.env`.**

- [ ] **DB / DSN**
  - `IPS_DSN=` (production DSN name), `IPS_UID=`, `IPS_PWD=`
  - `DRUG_DSN=` (only if drug data is a separate DSN; else leave blank = same as IPS)
  - `DB_POOL_INITIAL`, `DB_POOL_MAX` (tune to load)
  - `DB_CONNECTION_INIT_SQL=` (only if the DSN does NOT carry the Meditab auth option)
- [ ] **Large/slow responses** (REQUIRED — see §4/§5)
  - `DB_CURSOR_FETCH_SIZE=5000`
  - `SERVER_TIMEOUT_MS=300000`
  - `KEEPALIVE_TIMEOUT_MS=310000`
  - `HEADERS_TIMEOUT_MS=320000`
  - `REQUEST_TIMEOUT_MS=0`
- [ ] **Hardening / prod**
  - `NODE_ENV=production`
  - `STARTUP_DB_FAIL_FAST=1`  (refuse to start if the DB self-test fails — no silent empty data)
  - `STARTUP_DB_SELFTEST=1`, `STARTUP_SELFTEST_SP=sp_mym_getfacilitygroup`
  - `DEBUG_ERRORS=0`  (set to 1 only temporarily when diagnosing)
  - `PORT=3000`
  - `JWT_SECRET=` (**change from the default** — used by core/Phase-4 routes), `TOKEN_EXPIRATION_MIN=3`
  - `CORS_ORIGIN=*` (or lock down to known origins)

---

## 3. IIS — site `web.config`

Apply the repo's `iis/web.config` to the **IIS site that proxies to Node** (site root). It contains:
- [ ] URL Rewrite reverse-proxy rule → `http://localhost:3000/{R:1}`
- [ ] `system.web/httpRuntime executionTimeout="600"` (slow requests)
- [ ] `requestFiltering/requestLimits maxAllowedContentLength="104857600"` (~100 MB; allows the ~70 MB responses)
- [ ] (no `<defaultDocument>` — not needed for a pure proxy)

> ⚠️ A malformed web.config 500s the whole site. The repo copy is XML-validated. After copying, load
> the site root in a browser to confirm it didn't break.

---

## 4. IIS — ARR Server Proxy Timeout (SERVER-LEVEL — the key 502 fix)

**This CANNOT be set in web.config.** ARR's proxy timeout defaults to **30s** and is the cause of
**502 Bad Gateway** on slow endpoints (e.g. `Cycle/Getcyclerx_status` ~120s). Raise it:

- [ ] **IIS Manager** → click the **server node** (top level, NOT the site) → **Application Request
      Routing Cache** → **Server Proxy Settings** (right panel) → **Time-out (seconds) = 300** → Apply.
- [ ] **OR** (run as admin):
      ```
      %windir%\system32\inetsrv\appcmd.exe set config -section:system.webServer/proxy /timeout:"00:05:00" /commit:apphost
      ```
- [ ] For the very largest (~70 MB) calls, use `00:10:00` (600s) instead.

---

## 5. PM2 — run the app

- [ ] First time:
      ```
      cd <app-folder>
      pm2 start bin/www --name mapyourmeds-ips
      pm2 save
      ```
- [ ] Updates / after a `git pull`:
      ```
      pm2 restart mapyourmeds-ips
      ```
      **⚠️ Use `restart`, NOT `reload`.** On this Windows / fork-mode PM2, `reload` SILENTLY NO-OPS
      (process keeps running old code). Confirm it actually restarted:
      ```
      pm2 list      # uptime should reset to seconds; ↺ (restart count) should increment
      ```
- [ ] (Optional, for reliable zero-downtime reloads later: run in cluster mode
      `pm2 start bin/www -i 1 --name mapyourmeds-ips` — then `pm2 reload` works.)

---

## 6. Restart order after a deploy

1. `git pull` (code)
2. Apply/confirm `.env` changes
3. Apply IIS `web.config` (if changed) + ARR timeout (if not already set)
4. `iisreset`  (or recycle the site app pool)
5. `pm2 restart mapyourmeds-ips`  → confirm uptime reset + ↺ +1

---

## 7. Verify (do every deploy — this is the gate)

- [ ] **DB connectivity** (on the server):
      ```
      npm run smoke
      ```
      Expect: pool OK, `SELECT 1`, `sp_mym_getfacilitygroup` → rows, parameterized proc OK.
- [ ] **Status dashboard**: open `http://localhost:3000/` (or `/?format=json`) → `✅ HEALTHY`,
      `swallowedErrors.total: 0`. `/health/deep` → 200.
- [ ] **DB-access guard**: `npm run lint:db` → passes (no raw pool.query outside queryHelper).
- [ ] **All endpoints**: `npm run smoke:endpoints` → all 2xx.
- [ ] **Slow/large endpoint** (the 502 case) — both should be 200:
      ```
      curl -m 300 -X POST "http://localhost:3000/api/Cycle/Getcyclerx_status" -o NUL -w "node: %{http_code} %{time_total}s\n"
      curl -m 300 -X POST "http://<public-host>/api/Cycle/Getcyclerx_status"   -o NUL -w "iis:  %{http_code} %{time_total}s\n"
      ```
      If `node:`=200 but `iis:`=502 → ARR timeout (§4) not applied or too low.
- [ ] **Contract parity vs .NET** (from a host that reaches both):
      ```
      DOTNET_BASE_URL=https://mymsync.mapyourmedsapi.com:5003 npm run parity
      ```
      Expect 29/29 shapes match. (Value diffs = live-data drift, informational.)
- [ ] **Load-balancer / uptime probe** should target **`/health/deep`** (real DB check), NOT `/health`
      (liveness only), so a degraded DB pulls the node out of rotation.

---

## 8. Rollback

- [ ] `git checkout <previous-good-commit>` (or `git revert`) → `pm2 restart mapyourmeds-ips`.
- [ ] If a `web.config` change broke the IIS site (500), restore the previous `web.config` + `iisreset`.
- [ ] Cutover safety: the legacy .NET API (`https://mymsync.mapyourmedsapi.com:5003`) stays available;
      repoint the consumer's `IPS_API` back to it if needed.

---

## Server-change summary (the actual deltas vs a vanilla box)

| # | Change | Where | Why |
|---|--------|-------|-----|
| 1 | Install Node, PM2 (pm2-installer), IIS URL Rewrite + ARR, SQL Anywhere ODBC driver + DSN | server | runtime + proxy + DB |
| 2 | App code via git; `npm install` | app folder | the service |
| 3 | `.env` with DB/DSN, timeouts, hardening flags | app folder | config (no secrets in code) |
| 4 | `iis/web.config` → IIS site (proxy rule + executionTimeout 600 + maxAllowedContentLength 100MB) | IIS site | proxy + large/slow requests |
| 5 | **ARR Server Proxy Timeout → 300s** (server-level) | IIS server node | **the 502 fix** for slow endpoints |
| 6 | `pm2 start bin/www --name mapyourmeds-ips` + `pm2 save` | PM2 | run + survive reboot |
| 7 | LB/uptime probe → `/health/deep` | monitoring | catch degraded DB |

> Reminders that bit us on the current server: **`pm2 restart` not `reload`** (reload no-ops here);
> **ARR timeout is server-level** (not web.config); malformed web.config 500s the whole site.
