# IIS reverse-proxy config — long-running & large (up to ~70 MB) responses

The on-prem setup is **IIS (reverse proxy, ARR + URL Rewrite) → PM2 → Node (port 3000)**.
Some IPS stored procs are slow and return very large payloads (observed ~120s, up to ~70 MB,
e.g. `Cycle/Getcyclerx_status`). By default IIS/ARR **times out at ~30–60s and caps response
buffering**, returning **502 Bad Gateway**. The smallest timeout in the chain wins, so ALL of
these must be raised: ARR proxy timeout, request timeout, and content-length limits.

> Symptom this fixes: `getCycleRx` → `HTTP 502 ... gateway ... invalid response from content server`
> after ~56s. Root cause = ARR `proxyTimeout`, not the Node app (the cursor fix already solved the
> earlier ODBC memory crash).

## What to change (3 layers — do all)

### 1. ARR proxy timeout (server-level) — THE main 502 cause
ARR's proxy timeout defaults to **30s**. Raise it.

**IIS Manager:** click the **server node** (top level, not the site) → **Application Request
Routing Cache** → **Server Proxy Settings** (right panel) → set **Time-out (seconds) = 300**
(or higher) → **Apply**.

**Or** via `appcmd` (run as admin):
```
%windir%\system32\inetsrv\appcmd.exe set config -section:system.webServer/proxy /timeout:"00:05:00" /commit:apphost
```
(`00:05:00` = 5 min. Use `00:10:00` for the very largest 70 MB calls.)

### 2. Site web.config — request timeout, size limits, proxy preserve
Place the settings from `web.config.sample` (this folder) into the **IIS site's web.config**
(the site that proxies to Node, NOT the Node app folder). Key bits:
- `httpRuntime executionTimeout` raised
- `requestLimits maxAllowedContentLength` raised to allow ~70 MB+ responses
- URL Rewrite rule to the Node backend (if not already present)

### 3. Node side (already done in code)
`bin/www` now sets `server.timeout` / `keepAliveTimeout` / `headersTimeout` to ~5 min
(env-tunable: `SERVER_TIMEOUT_MS`, `KEEPALIVE_TIMEOUT_MS`, `HEADERS_TIMEOUT_MS`). The cursor
`fetchSize` default is 5000 (`DB_CURSOR_FETCH_SIZE`) to reduce round-trips on large results.
**Important ordering:** Node `keepAliveTimeout` should be ≥ the ARR/proxy idle timeout so Node
doesn't close the socket first.

## After applying
1. Apply ARR timeout (#1) + web.config (#2) on the server.
2. Restart IIS site (or `iisreset`) and **`pm2 restart mapyourmeds-ips`** (NOT reload — reload
   no-ops on this fork-mode/Windows PM2).
3. Test the slow endpoint directly:
   ```
   curl -m 300 -X POST "http://localhost:3000/api/Cycle/Getcyclerx_status" -o NUL -w "node: %{http_code} %{time_total}s %{size_download}b\n"
   curl -m 300 -X POST "http://ipsnode.mapyourmedsapi.com/api/Cycle/Getcyclerx_status" -o NUL -w "iis:  %{http_code} %{time_total}s %{size_download}b\n"
   ```
   - `node:` should be 200 (the app itself works).
   - `iis:` should now also be 200 (was 502). If `iis:` is still 502 but `node:` is 200, the ARR
     timeout (#1) wasn't applied / not high enough.
4. Re-run parity: `DOTNET_BASE_URL=https://mymsync.mapyourmedsapi.com:5003 npm run parity` → expect 29/29.

## Tuning for the largest (70 MB) calls
- ARR timeout: `00:10:00`+ if any call exceeds 5 min.
- `maxAllowedContentLength`: set comfortably above 70 MB (see sample = 104857600 = 100 MB).
- Node env: raise `SERVER_TIMEOUT_MS`/`KEEPALIVE_TIMEOUT_MS`/`HEADERS_TIMEOUT_MS` to match.
- Consider gzip on IIS (ARR can compress) to shrink 70 MB on the wire — big latency win.
