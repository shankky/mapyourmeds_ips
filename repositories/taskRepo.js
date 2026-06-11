'use strict';

/**
 * Task management data access — mirrors DataService/TaskDataService.cs
 * (the MetizDatasyncAPI TaskManagementController surface).
 *
 * Boolean-style status SPs are evaluated by row-existence in C#
 * (ExecuteQueryCheckRecordExists) — reproduced via `recordExists` here so the
 * returned shape matches (a JS boolean), not a raw row.
 */

const { callProc, callSql, recordExists } = require('../db/queryHelper');
const { mapRows } = require('../mappers/dtoMapper');
const S = require('../mappers/schemas');

// --- Patients (consumer-critical) -----------------------------------------

/** sp_mym_getpatientdatafacilityid(external_facility_id) → ImportPatientTask[] */
async function getPatientByFacility(external_facility_id) {
  return mapRows(await callProc('sp_mym_getpatientdatafacilityid', [external_facility_id]), S.ImportPatientTask);
}

/** sp_mym_getpatientdatatask(firstname, lastname) → ImportPatientTask[] */
async function getPatientData(firstname, lastname) {
  return mapRows(await callProc('sp_mym_getpatientdatatask', [firstname, lastname]), S.ImportPatientTask);
}

// --- Workflow status (consumer-critical) ----------------------------------

/** sp_mym_getfillingstatusbyrxnumber(Rxnumber, Patientid, Createddate) → bool */
function fillingStatusByRxNumber(Rxnumber, Patientid, Createddate) {
  return recordExists(callSql('sp_mym_getfillingstatusbyrxnumber', 3), [Rxnumber, Patientid, Createddate]);
}

/** sp_mym_getpvtatusbyrxnumber(Rxnumber, Patientid, Createddate) → bool (note SP name spelling) */
function pvStatusByRxNumber(Rxnumber, Patientid, Createddate) {
  return recordExists(callSql('sp_mym_getpvtatusbyrxnumber', 3), [Rxnumber, Patientid, Createddate]);
}

/** sp_mym_getmanifeststatusbyrxnumber(Rxnumber, Patientid, Createddate) → string */
const { getString } = require('../db/queryHelper');
function manifestStatusByRxNumber(Rxnumber, Patientid, Createddate) {
  return getString(callSql('sp_mym_getmanifeststatusbyrxnumber', 3), [Rxnumber, Patientid, Createddate]);
}

/** sp_mym_getstatuspvonesteponebyrxnumber(Rxnumber, Createddate) → bool */
function pvOneStepOneStatusByRxNumber(Rxnumber, Createddate) {
  return recordExists(callSql('sp_mym_getstatuspvonesteponebyrxnumber', 2), [Rxnumber, Createddate]);
}

/** sp_mym_getstatuspvonesteptwobyrxnumber(Rxnumber, Createddate) → PvoneSteptwo[] */
async function pvOneStepTwoStatusByRxNumber(Rxnumber, Createddate) {
  return mapRows(await callProc('sp_mym_getstatuspvonesteptwobyrxnumber', [Rxnumber, Createddate]), S.PvoneSteptwo);
}

/** sp_mym_getdeliverybypatient(Patient_id) → TransactionHistory[] (PatientDelivery == TransactionHistory shape) */
async function deliveryByPatient(Patient_id) {
  return mapRows(await callProc('sp_mym_getdeliverybypatient', [Patient_id]), S.TransactionHistory);
}

module.exports = {
  getPatientByFacility,
  getPatientData,
  fillingStatusByRxNumber,
  pvStatusByRxNumber,
  manifestStatusByRxNumber,
  pvOneStepOneStatusByRxNumber,
  pvOneStepTwoStatusByRxNumber,
  deliveryByPatient,
};
