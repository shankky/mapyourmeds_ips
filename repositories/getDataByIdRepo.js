'use strict';

/**
 * "GetDataByID" data access — mirrors the per-entity DataServices behind
 * MetizDatasyncAPI's GetDataByIDController (Doctor/Drug/Patient/Facility).
 *
 * The .NET controller had 4 separate actions on a bare controller route; the
 * client selects them by which query params are present. The router layer does
 * that branching; this repo just exposes one fn per stored proc.
 *
 * Note arg order: the .NET PatientDataService.GetUpdatedPatientData(patient_id,
 * groupid) flips the order vs the controller signature — preserved here.
 */

const { callProc } = require('../db/queryHelper');

/** sp_mym_getdoctorbyfacility(groupid, doctor_id) → ImportDoctor (first row) */
async function getUpdatedDoctorData(groupid, doctor_id) {
  const rows = await callProc('sp_mym_getdoctorbyfacility', [groupid, doctor_id]);
  return rows[0] || null;
}

/** sp_mym_getdrugbyfacility(groupid, drug_id) → ImportDurg (first row) */
async function getUpdatedDrugData(groupid, drug_id) {
  const rows = await callProc('sp_mym_getdrugbyfacility', [groupid, drug_id]);
  return rows[0] || null;
}

/** sp_mym_getpatientbyfacility(patient_id, groupid) → ImportPatient (first row). NB arg order. */
async function getUpdatedPatientData(groupid, patient_id) {
  const rows = await callProc('sp_mym_getpatientbyfacility', [patient_id, groupid]);
  return rows[0] || null;
}

/** sp_mym_getfacilitydata(groupid, external_facility_id) → ImportFacility (first row) */
async function getUpdatedFacilityData(groupid, external_facility_id) {
  const rows = await callProc('sp_mym_getfacilitydata', [groupid, external_facility_id]);
  return rows[0] || null;
}

module.exports = {
  getUpdatedDoctorData,
  getUpdatedDrugData,
  getUpdatedPatientData,
  getUpdatedFacilityData,
};
