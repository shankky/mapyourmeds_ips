# Postman collection — mapyourmeds_ips

`mapyourmeds_ips.postman_collection.json` — every datasync endpoint built so far (55 requests).
Schema: Postman Collection v2.1.

## Top-level folders
- **Status** (3) — status dashboard (HTML + JSON) and `/health`.
- **⭐ PRIORITY — Consumer (Phase 2)** (29) — the endpoints the live consumer (`ips.class.js`)
  actually calls. Verified 29/29 → 2xx on server. **Test these first.** Sub-grouped by controller.
- **Parity (Phase 3) — not consumer-called** (23) — extra MetizDatasyncAPI endpoints built ahead;
  lower priority.

> To run only the priority set: in Postman, right-click the **⭐ PRIORITY** folder → **Run folder**
> (Collection Runner executes just those 29).

## Import
1. Postman → **Import** → select `mapyourmeds_ips.postman_collection.json`.
2. Open the collection → **Variables** tab → set values for your environment (see below).
3. Send any request. All API endpoints are **POST** (matching the legacy API).

## Collection variables (edit on the Variables tab)
| Variable | Default | Notes |
|---|---|---|
| `baseUrl` | `http://localhost:3000` | The running app. Use the server host/port when testing on-prem. |
| `groupId` | `371` | external group id |
| `facilityId` | `34` | external facility id |
| `drugId` | `2116` | for GetDataByID?drug_id |
| `doctorId` | `-1` | for GetDataByID?doctor_id |
| `patientId` | `1966071` | used as patient_id / internalid / tran_id |
| `rxNo` | `50078646` | Rx number |
| `fillId` | `1` | fill id |
| `ndc` | `00093727198` | drug NDC |
| `date`, `startDate`, `endDate` | `2024-07-…` | `YYYY-MM-DD` |
| `startDateTime`, `endDateTime` | `2024-07-… 00:00:00` | for Route4Me |
| `createdDate` | `2024-07-25` | task status calls |
| `firstname`, `lastname` | `John` / `Smith` | patient search |

> Replace the sample IDs with values that exist on your DB to get non-empty results. Several calls
> legitimately return `[]` / `""` for unknown IDs (legacy parity — the .NET API did the same).

## Folders
Status · Facility · GetDataByID · TaskManagement · PrescriptionData · Cycle · RefillRequestData ·
MedSheet · DrugReceive.

Two endpoints use **query-param branching** (mirroring the legacy bare-controller routing):
- `GetDataByID` — `?drug_id` vs `?doctor_id`
- `PrescriptionData` — `?external_facility_id` (query) vs `{groupid, LastUpdatetime, wholeprofile}` (body)

## Note
These are the datasync endpoints (no auth, matching the live `ips.class.js` consumer). The core host
(Login / Patient / Prescription / Drug, with JWT) is Phase 4 — not in this collection yet.
