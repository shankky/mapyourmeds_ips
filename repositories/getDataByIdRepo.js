'use strict';

/**
 * "GetDataByID" data access — mirrors the per-entity DataServices behind
 * MetizDatasyncAPI's GetDataByIDController (Doctor/Drug/Patient/Facility).
 * Output shaped to the .NET DTO for parity. Each returns a single object (the
 * .NET action does FirstOrDefault) or null.
 *
 * Note arg order: the .NET PatientDataService.GetUpdatedPatientData(patient_id,
 * groupid) flips the order vs the controller signature — preserved here.
 */

const { callProc } = require('../db/queryHelper');
const { mapSingle } = require('../mappers/dtoMapper');
const S = require('../mappers/schemas');

/** sp_mym_getdoctorbyfacility(groupid, doctor_id) → ImportDoctor (first row) */
async function getUpdatedDoctorData(groupid, doctor_id) {
  return mapSingle(await callProc('sp_mym_getdoctorbyfacility', [groupid, doctor_id]), S.ImportDoctor);
}

/** sp_mym_getdrugbyfacility(groupid, drug_id) → ImportDurg (first row) */
async function getUpdatedDrugData(groupid, drug_id) {
  return mapSingle(await callProc('sp_mym_getdrugbyfacility', [groupid, drug_id]), S.ImportDurg);
}

/** sp_mym_getpatientbyfacility(patient_id, groupid) → ImportPatient (first row). NB arg order. */
async function getUpdatedPatientData(groupid, patient_id) {
  // ImportPatient DTO shares the task-patient fields here; use ImportPatientTask as base.
  return mapSingle(await callProc('sp_mym_getpatientbyfacility', [patient_id, groupid]), S.ImportPatientTask);
}

/** sp_mym_getfacilitydata(groupid, external_facility_id) → ImportFacility (first row) */
async function getUpdatedFacilityData(groupid, external_facility_id) {
  return mapSingle(await callProc('sp_mym_getfacilitydata', [groupid, external_facility_id]), S.ImportFacility);
}

module.exports = {
  getUpdatedDoctorData,
  getUpdatedDrugData,
  getUpdatedPatientData,
  getUpdatedFacilityData,
};
