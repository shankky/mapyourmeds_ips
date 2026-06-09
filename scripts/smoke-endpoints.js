'use strict';

/**
 * Phase-2 endpoint smoke test. RUN ON THE SERVER while the app is running:
 *
 *   npm start                 # in one terminal
 *   node scripts/smoke-endpoints.js   # in another (or set BASE_URL)
 *
 * Hits each consumer-critical endpoint with sample inputs and prints status +
 * row/shape summary. It does NOT assert correctness (that's the contract-parity
 * test in Phase 6) — it's a fast "is every route wired to a working SP?" check.
 *
 * Override sample inputs via env (see SAMPLES below) to use IDs valid on this DB.
 * Uses only Node's built-in http (no extra deps).
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const S = {
  facilityId: process.env.SMK_FACILITY_ID || '34',
  groupId: process.env.SMK_GROUP_ID || '371',
  drugId: process.env.SMK_DRUG_ID || '2116',
  doctorId: process.env.SMK_DOCTOR_ID || '-1',
  patientId: process.env.SMK_PATIENT_ID || '1966071',
  rxNo: process.env.SMK_RX || '50078646',
  fillId: process.env.SMK_FILL_ID || '1',
  ndc: process.env.SMK_NDC || '00093727198',
  date: process.env.SMK_DATE || '2024-07-25',
  startDate: process.env.SMK_START || '2024-07-01',
  endDate: process.env.SMK_END || '2024-07-31',
  startDt: process.env.SMK_START_DT || '2024-07-01 00:00:00',
  endDt: process.env.SMK_END_DT || '2024-07-31 23:59:59',
  createdDate: process.env.SMK_CREATED || '2024-07-25',
  firstname: process.env.SMK_FIRST || 'John',
  lastname: process.env.SMK_LAST || 'Smith',
};

// [label, path, body|null]  — consumer-critical set (matches ips.class.js)
const CALLS = [
  ['getAllGroups', '/api/Facility/GetFacilityGroup', {}],
  ['getAllFacility', '/api/Facility/GetAllFacility', {}],
  ['getDrugByGroup', `/api/GetDataByID?groupid=${S.groupId}&drug_id=${S.drugId}`, {}],
  ['getDoctorByGroup', `/api/GetDataByID?groupid=${S.groupId}&doctor_id=${S.doctorId}`, {}],
  ['getPatientsByFacility', `/api/TaskManagement/GetPatientByFacility?external_facility_id=${S.facilityId}`, {}],
  ['getPatientsData', `/api/TaskManagement/GetPatientData?firstname=${S.firstname}&lastname=${S.lastname}`, {}],
  ['getPatientByExternalId', `/api/PrescriptionData/Getpatientbyinternalid?internalid=${S.patientId}`, {}],
  ['getPrescriptionsByFacility', `/api/PrescriptionData?external_facility_id=${S.facilityId}`, {}],
  ['getPrescriptionsByGroupIdAndDate', '/api/PrescriptionData', { LastUpdatetime: S.date, groupid: S.groupId, wholeprofile: true }],
  ['getSplitPrescriptionsByFacility', `/api/PrescriptionData/GetSplitPrescriptions?FacilityID=${S.facilityId}`, {}],
  ['getPrescriptionDetailByRxNo', `/api/PrescriptionData/Getprescriptiondetailbyrxno?rx_no=${S.rxNo}`, {}],
  ['getPrescriptionByFillId', `/api/PrescriptionData/GetPrescriptionByFillid?FillID=${S.fillId}`, {}],
  ['getDrugFromDate', `/api/PrescriptionData/GetDrugUpdate?date=${S.date}`, {}],
  ['deliveryByPatientAndDate', `/api/PrescriptionData/Getdeliverybypatientanddate?Patientid=${S.patientId}&startdate=${S.startDate}&enddate=${S.endDate}`, {}],
  ['deliveryByFacilityAndDate', `/api/PrescriptionData/Getdeliverybyfacilityanddate?facility=${S.facilityId}&startdate=${S.startDate}&enddate=${S.endDate}`, {}],
  ['route4MeByDate', `/api/PrescriptionData/GetRoute4MeDataByDate?startdatetime=${encodeURIComponent(S.startDt)}&enddatetime=${encodeURIComponent(S.endDt)}`, {}],
  ['prescriptionImagePath', `/api/PrescriptionData/Getprescriptionimagepath?tran_id=${S.patientId}`, {}],
  ['getCycleRx', '/api/Cycle/Getcyclerx_status', {}],
  ['getCycleInhospital', '/api/Cycle/Getcycle_Inhospital', {}],
  ['pvOneStepOne', `/api/TaskManagement/PvoneSteponestatusByRxnumber?Rxnumber=${S.rxNo}&Createddate=${S.createdDate}`, {}],
  ['pvOneStepTwo', `/api/TaskManagement/PvoneSteptwostatusByRxnumber?Rxnumber=${S.rxNo}&Createddate=${S.createdDate}`, {}],
  ['fillingStatus', `/api/TaskManagement/FillingstatusByRxnumber?Rxnumber=${S.rxNo}&Patientid=${S.patientId}&Createddate=${S.createdDate}`, {}],
  ['pvTwoStatus', `/api/TaskManagement/PVstatusByRxnumber?Rxnumber=${S.rxNo}&Patientid=${S.patientId}&Createddate=${S.createdDate}`, {}],
  ['manifestStatus', `/api/TaskManagement/ManifeststatusByRxnumber?Rxnumber=${S.rxNo}&Patientid=${S.patientId}&Createddate=${S.createdDate}`, {}],
  ['deliveryByPatient', `/api/TaskManagement/DeliveryByPatient?Patient_id=${S.patientId}`, {}],
  ['getWeeklyRefillReminder', '/api/RefillRequestData/GetWeeklyRefillReminder', {}],
  ['getMedPassData', `/api/MedSheet/GeteMedPassData?date=${S.date}`, {}],
  ['getPatientImagePath', `/api/DrugReceive/Getpatientimagepath?patient_id=${S.patientId}`, {}],
  ['getDrugImagePath', `/api/DrugReceive/GetDrugimagepath?ndc=${S.ndc}`, {}],
];

function post(path, body) {
  return new Promise((resolve) => {
    const u = new URL(path, BASE_URL);
    const data = Buffer.from(JSON.stringify(body || {}));
    const req = http.request(
      { method: 'POST', hostname: u.hostname, port: u.port, path: u.pathname + u.search,
        headers: { 'content-type': 'application/json', 'content-length': data.length } },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => resolve({ status: res.statusCode, body: buf }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.write(data);
    req.end();
  });
}

function summarize(body) {
  try {
    const j = JSON.parse(body);
    if (Array.isArray(j)) return `array[${j.length}]` + (j[0] ? ` keys=${Object.keys(j[0]).slice(0, 6).join(',')}` : '');
    if (j && typeof j === 'object') {
      if (j.errorCode) return `ERR ${j.errorCode}: ${String(j.errorDescription).slice(0, 60)}`;
      return `object keys=${Object.keys(j).slice(0, 6).join(',')}`;
    }
    return `scalar ${JSON.stringify(j)}`;
  } catch (_) {
    return `non-json (${body.slice(0, 40)})`;
  }
}

(async () => {
  console.log(`Smoke-testing ${CALLS.length} endpoints against ${BASE_URL}\n`);
  let ok = 0;
  for (const [label, path, body] of CALLS) {
    /* eslint-disable no-await-in-loop */
    const r = await post(path, body);
    const pass = r.status >= 200 && r.status < 300;
    if (pass) ok++;
    console.log(`${pass ? 'OK ' : 'XX '} [${String(r.status).padStart(3)}] ${label.padEnd(34)} ${summarize(r.body)}`);
  }
  console.log(`\n${ok}/${CALLS.length} returned 2xx`);
  process.exit(ok === CALLS.length ? 0 : 1);
})();
