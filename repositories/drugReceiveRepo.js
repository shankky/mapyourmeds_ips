'use strict';

/**
 * Drug-receive / image-path data access — mirrors DataService/DrugReceiveService.cs
 * (MetizDatasyncAPI DrugReceiveController surface).
 *
 * GetDrugimagepath uses the DRUG datasource in the .NET code (SybaseContextDrug).
 * Here it runs against the drug pool, which aliases the IPS pool unless DRUG_DSN
 * is configured separately.
 */

const { callProc, callSql, getString } = require('../db/queryHelper');
const { getDrugPool } = require('../db/pool');

// --- consumer-critical -----------------------------------------------------

/** sp_mym_getpatientimagepath(patient_id) → string (IPS pool) */
function getPatientImagePath(patient_id) {
  return getString(callSql('sp_mym_getpatientimagepath', 1), [patient_id]);
}

/** sp_mym_getDrugimagepath(ndc) → string (DRUG pool) */
async function getDrugImagePath(ndc) {
  const pool = await getDrugPool();
  return getString(callSql('sp_mym_getDrugimagepath', 1), [ndc], pool);
}

// --- parity (not consumer-critical) ---------------------------------------

/** sp_mym_getdeliverylist(deliveryno, facilityid) → DrugDeliveryResponse[] */
function getDeliveryList(deliveryno, facilityid) {
  return callProc('sp_mym_getdeliverylist', [deliveryno, facilityid]);
}

/** sp_mym_getsystempath → string */
function getSystemPath() {
  return getString(callSql('sp_mym_getsystempath', 0), []);
}

/** sp_mym_getdeliverynobyfacility(facilityid) → ModelDeliveryNo[] */
function getDeliveryNoByFacility(facilityid) {
  return callProc('sp_mym_getdeliverynobyfacility', [facilityid]);
}

/** sp_mym_getdeliverypendinglist(facilityid) → ModelDeliveryPending[] */
function getDeliveryPendingList(facilityid) {
  return callProc('sp_mym_getdeliverypendinglist', [facilityid]);
}

/** sp_mym_getDrugdescription(ndc) → ModelDrugDescription (first row) */
async function getDrugDescription(ndc) {
  const rows = await callProc('sp_mym_getDrugdescription', [ndc]);
  return rows[0] || null;
}

module.exports = {
  getPatientImagePath,
  getDrugImagePath,
  getDeliveryList,
  getSystemPath,
  getDeliveryNoByFacility,
  getDeliveryPendingList,
  getDrugDescription,
};
