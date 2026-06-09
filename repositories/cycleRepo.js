'use strict';

/**
 * Cycle data access — mirrors DataService/CycleService.cs
 * (MetizDatasyncAPI CycleController surface).
 */

const { callProc } = require('../db/queryHelper');

/** sp_mym_getcyclerx_status → ModelCycleStatus[] (consumer-critical) */
function getCycleRxStatus() {
  return callProc('sp_mym_getcyclerx_status', []);
}

/** sp_mym_getcycle_inhospital → ModelHospitalPatientDrugDetail[] (consumer-critical) */
function getCycleInhospital() {
  return callProc('sp_mym_getcycle_inhospital', []);
}

// --- parity (not consumer-critical) ---------------------------------------
function getCycleRx7days() { return callProc('sp_mym_getcyclerx_7days', []); }
function getCycleRx14days() { return callProc('sp_mym_getcyclerx_14days', []); }
function getCycleRx21days() { return callProc('sp_mym_getcyclerx_21days', []); }
function getDeliveryDriverFor2Days() { return callProc('sp_mym_getdeliverydriverfor2days', []); }
function getPv2StatusByRx(rx_id) { return callProc('sp_pt_getpv2statusbyrx', [rx_id]); }
function getBilledStatusByRx(rx_id) { return callProc('sp_pt_getbilledstatusbyrx', [rx_id]); }

module.exports = {
  getCycleRxStatus,
  getCycleInhospital,
  getCycleRx7days,
  getCycleRx14days,
  getCycleRx21days,
  getDeliveryDriverFor2Days,
  getPv2StatusByRx,
  getBilledStatusByRx,
};
