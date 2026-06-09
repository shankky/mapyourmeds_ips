'use strict';

/**
 * Prescription-data access — mirrors DataService/PrescriptionDataService.cs
 * (MetizDatasyncAPI PrescriptionDataController surface).
 *
 * Includes the two consumer-critical "bare controller" entry points the client
 * reaches by query-param/body shape (router does the branching):
 *   - getUpdatedPrescriptionData(body {LastUpdatetime, groupid, wholeprofile})
 *   - getUpdatedPrescriptionDataByFacilityID(?external_facility_id)
 */

const { callProc, callSql, getString } = require('../db/queryHelper');

// --- "bare controller" branches (consumer-critical) -----------------------

/** sp_mym_getprescriptionbygroup(groupid, LastUpdatetime) → ImportPrescription[] */
function getUpdatedPrescriptionData(groupid, lastUpdatetime) {
  return callProc('sp_mym_getprescriptionbygroup', [groupid, lastUpdatetime]);
}

/** sp_mym_getprescriptionbyfacility(external_facility_id) → ImportPrescription[] */
function getUpdatedPrescriptionDataByFacilityID(external_facility_id) {
  return callProc('sp_mym_getprescriptionbyfacility', [external_facility_id]);
}

// --- explicit-route endpoints (consumer-critical) -------------------------

/** sp_mym_splitprescriptions(FacilityID) → SplitPrescriptionsModel[] */
function getSplitPrescriptions(FacilityID) {
  return callProc('sp_mym_splitprescriptions', [FacilityID]);
}

/** sp_mym_getprescriptiondetailbyrxno(rx_no) → ImportPrescriptionDaily[] */
function getPrescriptionDetailByRxNo(rx_no) {
  return callProc('sp_mym_getprescriptiondetailbyrxno', [rx_no]);
}

/** sp_mym_getprescription_by_fillid(FillID) → Prescription_By_Fillid[] */
function getPrescriptionByFillId(FillID) {
  return callProc('sp_mym_getprescription_by_fillid', [FillID]);
}

/** sp_mym_getdrugupdate(date) → DrugUpdateModel[] */
function getDrugUpdate(date) {
  return callProc('sp_mym_getdrugupdate', [date]);
}

/** sp_mym_getdeliverybypatientanddate(patientid, startdate, enddate) → TransactionHistory[] */
function getDeliveryByPatientAndDate(patientid, startdate, enddate) {
  return callProc('sp_mym_getdeliverybypatientanddate', [patientid, startdate, enddate]);
}

/** sp_mym_getdeliverybyfacilityanddate(facility, startdate, enddate) → TransactionHistory[] */
function getDeliveryByFacilityAndDate(facility, startdate, enddate) {
  return callProc('sp_mym_getdeliverybyfacilityanddate', [facility, startdate, enddate]);
}

/** sp_mym_get_route4me_data(startdatetime, enddatetime) → GetRoute4MeDataModel[] */
function getRoute4MeDataByDate(startdatetime, enddatetime) {
  return callProc('sp_mym_get_route4me_data', [startdatetime, enddatetime]);
}

/** sp_mym_getprescriptionimagepath(tran_id) → string */
function getPrescriptionImagePath(tran_id) {
  return getString(callSql('sp_mym_getprescriptionimagepath', 1), [tran_id]);
}

/** sp_mym_getpatientbyinternalid(internalid) → ImportPatientInternalTask[] */
function getPatientByInternalId(internalid) {
  return callProc('sp_mym_getpatientbyinternalid', [internalid]);
}

module.exports = {
  getUpdatedPrescriptionData,
  getUpdatedPrescriptionDataByFacilityID,
  getSplitPrescriptions,
  getPrescriptionDetailByRxNo,
  getPrescriptionByFillId,
  getDrugUpdate,
  getDeliveryByPatientAndDate,
  getDeliveryByFacilityAndDate,
  getRoute4MeDataByDate,
  getPrescriptionImagePath,
  getPatientByInternalId,
};
