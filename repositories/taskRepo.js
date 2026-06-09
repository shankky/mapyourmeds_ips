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

// --- Patients (consumer-critical) -----------------------------------------

/** sp_mym_getpatientdatafacilityid(external_facility_id) → ImportPatientTask[] */
function getPatientByFacility(external_facility_id) {
  return callProc('sp_mym_getpatientdatafacilityid', [external_facility_id]);
}

/** sp_mym_getpatientdatatask(firstname, lastname) → ImportPatientTask[] */
function getPatientData(firstname, lastname) {
  return callProc('sp_mym_getpatientdatatask', [firstname, lastname]);
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
function pvOneStepTwoStatusByRxNumber(Rxnumber, Createddate) {
  return callProc('sp_mym_getstatuspvonesteptwobyrxnumber', [Rxnumber, Createddate]);
}

/** sp_mym_getdeliverybypatient(Patient_id) → PatientDelivery[] */
function deliveryByPatient(Patient_id) {
  return callProc('sp_mym_getdeliverybypatient', [Patient_id]);
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
