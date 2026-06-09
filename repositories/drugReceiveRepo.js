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
const logger = require('../utils/logger');

// --- consumer-critical -----------------------------------------------------
// NOTE: the .NET DrugReceiveService wrapped the three string-returning path
// methods (Getsystempath / Getpatientimagepath / GetDrugimagepath) in
// try/catch and returned "" on ANY error. We preserve that exactly so the
// consumer (which expects a string / {image} wrapper) never sees a 500.

/** sp_mym_getpatientimagepath(patient_id) → string (IPS pool); "" on error (legacy parity) */
async function getPatientImagePath(patient_id) {
  try {
    return await getString(callSql('sp_mym_getpatientimagepath', 1), [patient_id]);
  } catch (err) {
    logger.warn(`[drugReceive] getPatientImagePath swallowed error (legacy parity): ${err.message}`);
    return '';
  }
}

/** sp_mym_getDrugimagepath(ndc) → string (DRUG pool); "" on error (legacy parity) */
async function getDrugImagePath(ndc) {
  try {
    const pool = await getDrugPool();
    return await getString(callSql('sp_mym_getDrugimagepath', 1), [ndc], pool);
  } catch (err) {
    logger.warn(`[drugReceive] getDrugImagePath swallowed error (legacy parity): ${err.message}`);
    return '';
  }
}

// --- parity (not consumer-critical) ---------------------------------------

/** sp_mym_getdeliverylist(deliveryno, facilityid) → DrugDeliveryResponse[] */
function getDeliveryList(deliveryno, facilityid) {
  return callProc('sp_mym_getdeliverylist', [deliveryno, facilityid]);
}

/** sp_mym_getsystempath → string; "" on error (legacy parity) */
async function getSystemPath() {
  try {
    return await getString(callSql('sp_mym_getsystempath', 0), []);
  } catch (err) {
    logger.warn(`[drugReceive] getSystemPath swallowed error (legacy parity): ${err.message}`);
    return '';
  }
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
