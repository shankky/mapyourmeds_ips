# Contract-parity check (Express port vs existing .NET API)

Confirms the Express output **structurally matches** the existing .NET API for the 29
consumer-critical endpoints, with identical inputs. This is the Phase-6 acceptance gate
(IPS-066) — "drop-in compatible" means same field names, casing, types, and shape so
`mym/config/ips.class.js` works against either.

- **Express (new):** `http://ipsnode.mapyourmedsapi.com/`
- **.NET (old):**   `https://mymsync.mapyourmedsapi.com:5003`

## What it compares
- **SHAPE** (the acceptance criterion): field names + casing + types + array/object + nesting.
- **VALUES** (informational): exact value diffs — expect some live-data drift (a prescription
  added/picked-up between the two calls, shifting dates, etc.). Investigate large/structural diffs.

The endpoint list + sample inputs are shared with the smoke test via
`scripts/consumer-endpoints.js` (single source of truth). Override sample IDs with `SMK_*` env vars.

## How to run — pick the mode that fits your network

### Mode A — LIVE A/B (best; needs a host that can reach BOTH APIs)
The .NET API is firewalled to specific networks, so run this **on the on-prem server (or VPN)
that can reach both** `ipsnode...` and `mymsync...:5003`:

```bash
set BASE_URL=http://ipsnode.mapyourmedsapi.com           # the Express server (or http://localhost:3000 if local)
set DOTNET_BASE_URL=https://mymsync.mapyourmedsapi.com:5003
npm run parity
```
(PowerShell: `$env:BASE_URL=...; $env:DOTNET_BASE_URL=...; npm run parity`)

Calls both back-to-back per endpoint and diffs immediately (same-moment data = least drift).

### Mode B — SNAPSHOT (when no single host reaches both)
1. From a machine/network that can reach the **.NET API**, capture baselines:
   ```bash
   set DOTNET_BASE_URL=https://mymsync.mapyourmedsapi.com:5003
   npm run parity:capture          # writes parity/baseline/<label>.json
   ```
   (Or capture the same 29 calls via Postman against the old API and save each response as
   `parity/baseline/<label>.json` — labels are listed in `scripts/consumer-endpoints.js`.)
2. From a machine that can reach **Express**, diff against the saved baselines (no DOTNET_BASE_URL):
   ```bash
   set BASE_URL=http://ipsnode.mapyourmedsapi.com
   npm run parity
   ```

## Output
- Console: per-endpoint `OK/XX`, both HTTP statuses, shape match, field diffs, value-diff count.
- `parity/report.json`: full machine-readable report.
- Exit 0 if all shapes match; 1 otherwise.

## ⚠️ PHI
Baseline files and the report contain **real patient/prescription data**. They are git-ignored
(`parity/baseline/`, `parity/report.json`) — do not commit or share them. Delete after use.

## Tuning
- `PARITY_TIMEOUT_MS` (default 15000) — per-request timeout.
- `SMK_*` env vars — sample inputs (facility/group/patient/rx/ndc/dates). Use IDs valid on the DB.
