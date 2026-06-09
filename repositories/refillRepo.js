'use strict';

/**
 * Refill-request data access — mirrors DataService/RefillRequestDataService.cs
 * (MetizDatasyncAPI RefillRequestDataController surface).
 */

const { callProc } = require('../db/queryHelper');

/** sp_mym_getweeklyrefillreminder → ModelGetWeeklyRefillReminder[] (consumer-critical) */
function getWeeklyRefillReminder() {
  return callProc('sp_mym_getweeklyrefillreminder', []);
}

// --- parity (not consumer-critical) ---------------------------------------
function getRefillRequestLog() { return callProc('sp_mym_getrefillrequestlog', []); }
function getDeliveryToBeDelivered() { return callProc('sp_mym_getdelivery_tobedelivered', []); }
function getNewRxToBeDelivered() { return callProc('sp_mym_getnewrx_tobedelivered', []); }
function getPartialPrescriptionByFacility(facility_idd) {
  return callProc('sp_mym_getpartialprescriptionbyfacility', [facility_idd]);
}

module.exports = {
  getWeeklyRefillReminder,
  getRefillRequestLog,
  getDeliveryToBeDelivered,
  getNewRxToBeDelivered,
  getPartialPrescriptionByFacility,
};
