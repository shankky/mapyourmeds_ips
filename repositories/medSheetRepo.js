'use strict';

/**
 * MedSheet / dose data access — mirrors DataService/MedSheetDataService.cs
 * (MetizDatasyncAPI MedSheetController surface).
 */

const { callProc, callSql, getString } = require('../db/queryHelper');
const { mapRows } = require('../mappers/dtoMapper');
const S = require('../mappers/schemas');

/** sp_mym_getemedpassdata(date) → PatientMedPassModel[] (consumer-critical) */
async function getEMedPassData(date) {
  return mapRows(await callProc('sp_mym_getemedpassdata', [date]), S.PatientMedPassModel);
}

// --- parity (not consumer-critical) ---------------------------------------

/** sp_mym_medsheet(ae_patient_id, ad_startdate, ae_office, ad_enddate) → PatientMedSheet[] */
function getPatientMedSheetReport(ae_patient_id, ad_startdate, ae_office, ad_enddate) {
  return callProc('sp_mym_medsheet', [ae_patient_id, ad_startdate, ae_office, ad_enddate]);
}

/** sp_mym_get_ips_internal_patientid(patientexternalid) → string */
function getIPSInternalPatientId(patientexternalid) {
  return getString(callSql('sp_mym_get_ips_internal_patientid', 1), [patientexternalid]);
}

/** sp_mym_get_profile_changed_patient_by_group(groupid, facilityid, lastdate) → Profile_Changed_Patient[] */
function getProfileChangedPatientByGroup(groupid, facilityid, lastdate) {
  return callProc('sp_mym_get_profile_changed_patient_by_group', [groupid, facilityid, lastdate]);
}

/** sp_mym_getprescriptiondata_byrxnumber(rxnumber) → PrescriptionData[] */
function getPrescriptionDataByRxNumber(rxnumber) {
  return callProc('sp_mym_getprescriptiondata_byrxnumber', [rxnumber]);
}

/** sp_mym_get_changedprescription_bypatient(patientid) → ChangedPrescription[] */
function getChangedPrescriptionByPatient(patientid) {
  return callProc('sp_mym_get_changedprescription_bypatient', [patientid]);
}

module.exports = {
  getEMedPassData,
  getPatientMedSheetReport,
  getIPSInternalPatientId,
  getProfileChangedPatientByGroup,
  getPrescriptionDataByRxNumber,
  getChangedPrescriptionByPatient,
};
