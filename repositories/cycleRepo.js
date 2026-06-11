'use strict';

/**
 * Cycle data access — mirrors DataService/CycleService.cs
 * (MetizDatasyncAPI CycleController surface).
 */

const { callProc } = require('../db/queryHelper');
const { mapRows } = require('../mappers/dtoMapper');
const S = require('../mappers/schemas');

/** sp_mym_getcyclerx_status → ModelCycleStatus[] (consumer-critical) */
async function getCycleRxStatus() {
  return mapRows(await callProc('sp_mym_getcyclerx_status', []), S.ModelCycleStatus);
}

/** sp_mym_getcycle_inhospital → ModelHospitalPatientDrugDetail[] (consumer-critical) */
async function getCycleInhospital() {
  return mapRows(await callProc('sp_mym_getcycle_inhospital', []), S.ModelHospitalPatientDrugDetail);
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
