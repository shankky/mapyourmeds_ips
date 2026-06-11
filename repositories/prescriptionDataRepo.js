'use strict';

/**
 * Prescription-data access — mirrors DataService/PrescriptionDataService.cs
 * (MetizDatasyncAPI PrescriptionDataController surface). Output shaped to the
 * .NET DTOs (field names/casing/order, null fields, stringified) for parity.
 *
 * Includes the two consumer-critical "bare controller" entry points the client
 * reaches by query-param/body shape (router does the branching):
 *   - getUpdatedPrescriptionData(body {LastUpdatetime, groupid, wholeprofile})
 *   - getUpdatedPrescriptionDataByFacilityID(?external_facility_id)
 */

const { callProc, callSql, getString } = require('../db/queryHelper');
const { mapRows } = require('../mappers/dtoMapper');
const S = require('../mappers/schemas');

// --- "bare controller" branches (consumer-critical) -----------------------

/** sp_mym_getprescriptionbygroup(groupid, LastUpdatetime) → ImportPrescription[] */
async function getUpdatedPrescriptionData(groupid, lastUpdatetime) {
  return mapRows(await callProc('sp_mym_getprescriptionbygroup', [groupid, lastUpdatetime]), S.ImportPrescription);
}

/** sp_mym_getprescriptionbyfacility(external_facility_id) → ImportPrescription[] */
async function getUpdatedPrescriptionDataByFacilityID(external_facility_id) {
  return mapRows(await callProc('sp_mym_getprescriptionbyfacility', [external_facility_id]), S.ImportPrescription);
}

// --- explicit-route endpoints (consumer-critical) -------------------------

/** sp_mym_splitprescriptions(FacilityID) → SplitPrescriptionsModel[] */
async function getSplitPrescriptions(FacilityID) {
  return mapRows(await callProc('sp_mym_splitprescriptions', [FacilityID]), S.SplitPrescriptionsModel);
}

/** sp_mym_getprescriptiondetailbyrxno(rx_no) → ImportPrescriptionDaily[] */
async function getPrescriptionDetailByRxNo(rx_no) {
  return mapRows(await callProc('sp_mym_getprescriptiondetailbyrxno', [rx_no]), S.ImportPrescriptionDaily);
}

/** sp_mym_getprescription_by_fillid(FillID) → Prescription_By_Fillid[] */
async function getPrescriptionByFillId(FillID) {
  return mapRows(await callProc('sp_mym_getprescription_by_fillid', [FillID]), S.Prescription_By_Fillid);
}

/** sp_mym_getdrugupdate(date) → DrugUpdateModel[] */
async function getDrugUpdate(date) {
  return mapRows(await callProc('sp_mym_getdrugupdate', [date]), S.DrugUpdateModel);
}

/** sp_mym_getdeliverybypatientanddate(patientid, startdate, enddate) → TransactionHistory[] */
async function getDeliveryByPatientAndDate(patientid, startdate, enddate) {
  return mapRows(await callProc('sp_mym_getdeliverybypatientanddate', [patientid, startdate, enddate]), S.TransactionHistory);
}

/** sp_mym_getdeliverybyfacilityanddate(facility, startdate, enddate) → TransactionHistory[] */
async function getDeliveryByFacilityAndDate(facility, startdate, enddate) {
  return mapRows(await callProc('sp_mym_getdeliverybyfacilityanddate', [facility, startdate, enddate]), S.TransactionHistory);
}

/** sp_mym_get_route4me_data(startdatetime, enddatetime) → GetRoute4MeDataModel[] */
async function getRoute4MeDataByDate(startdatetime, enddatetime) {
  return mapRows(await callProc('sp_mym_get_route4me_data', [startdatetime, enddatetime]), S.GetRoute4MeDataModel);
}

/** sp_mym_getprescriptionimagepath(tran_id) → string */
function getPrescriptionImagePath(tran_id) {
  return getString(callSql('sp_mym_getprescriptionimagepath', 1), [tran_id]);
}

/** sp_mym_getpatientbyinternalid(internalid) → ImportPatientInternalTask[] */
async function getPatientByInternalId(internalid) {
  return mapRows(await callProc('sp_mym_getpatientbyinternalid', [internalid]), S.ImportPatientInternalTask);
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
