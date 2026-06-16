'use strict';

/**
 * /api/PrescriptionData — mirrors MetizDatasyncAPI PrescriptionDataController.
 *
 * BARE-CONTROLLER BRANCHING at the mount root (POST /api/PrescriptionData):
 *   - body { groupid, LastUpdatetime, wholeprofile }  → GetUpdatedPrescriptionData
 *       (client: getPrescriptionsByGroupIdAndDate)
 *   - query ?external_facility_id=                      → GetUpdatedPrescriptionDataByFacilityID
 *       (client: getPrescriptionsByFacility)
 * In .NET these were two no-[Route] actions selected by body-model vs query
 * param. We branch explicitly here.
 *
 * All other endpoints have explicit action sub-paths. Case-sensitive query
 * params match the client exactly (rx_no, FillID, FacilityID, Patientid, etc.).
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const repo = require('../../repositories/prescriptionDataRepo');

// POST /api/PrescriptionData  (branch: body-by-group  OR  ?external_facility_id)
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  // by group + date (body form) — the client always sends groupid + LastUpdatetime
  if (body.groupid !== undefined || body.LastUpdatetime !== undefined) {
    return res.json(await repo.getUpdatedPrescriptionData(body.groupid, body.LastUpdatetime));
  }
  // by facility id (query form)
  if (req.query.external_facility_id !== undefined) {
    return res.json(await repo.getUpdatedPrescriptionDataByFacilityID(req.query.external_facility_id));
  }
  const err = new Error('PrescriptionData requires body {groupid, LastUpdatetime} or query external_facility_id');
  err.status = 400;
  err.expose = true;
  throw err;
}));

// POST /api/PrescriptionData/GetSplitPrescriptions?FacilityID=
router.post('/GetSplitPrescriptions', asyncHandler(async (req, res) => {
  res.json(await repo.getSplitPrescriptions(req.query.FacilityID));
}));

// POST /api/PrescriptionData/Getprescriptiondetailbyrxno?rx_no=
router.post('/Getprescriptiondetailbyrxno', asyncHandler(async (req, res) => {
  res.json(await repo.getPrescriptionDetailByRxNo(req.query.rx_no));
}));

// POST /api/PrescriptionData/GetPrescriptionByFillid?FillID=
router.post('/GetPrescriptionByFillid', asyncHandler(async (req, res) => {
  res.json(await repo.getPrescriptionByFillId(req.query.FillID));
}));

// POST /api/PrescriptionData/GetDrugUpdate?date=
router.post('/GetDrugUpdate', asyncHandler(async (req, res) => {
  res.json(await repo.getDrugUpdate(req.query.date));
}));

// POST /api/PrescriptionData/Getdeliverybypatientanddate?Patientid=&startdate=&enddate=
router.post('/Getdeliverybypatientanddate', asyncHandler(async (req, res) => {
  const { Patientid, startdate, enddate } = req.query;
  res.json(await repo.getDeliveryByPatientAndDate(Patientid, startdate, enddate));
}));

// POST /api/PrescriptionData/Getdeliverybyfacilityanddate?facility=&startdate=&enddate=
router.post('/Getdeliverybyfacilityanddate', asyncHandler(async (req, res) => {
  const { facility, startdate, enddate } = req.query;
  res.json(await repo.getDeliveryByFacilityAndDate(facility, startdate, enddate));
}));

// POST /api/PrescriptionData/GetRoute4MeDataByDate?startdatetime=&enddatetime=
router.post('/GetRoute4MeDataByDate', asyncHandler(async (req, res) => {
  const { startdatetime, enddatetime } = req.query;
  res.json(await repo.getRoute4MeDataByDate(startdatetime, enddatetime));
}));

// POST /api/PrescriptionData/Getprescriptionimagepath?tran_id=  → string
router.post('/Getprescriptionimagepath', asyncHandler(async (req, res) => {
  res.json(await repo.getPrescriptionImagePath(req.query.tran_id));
}));

// POST /api/PrescriptionData/Getpatientbyinternalid?internalid=
router.post('/Getpatientbyinternalid', asyncHandler(async (req, res) => {
  res.json(await repo.getPatientByInternalId(req.query.internalid));
}));

// --- Phase 3 (parity, not consumer-called) --------------------------------

// POST /api/PrescriptionData/GetUpdatedPrescriptionDataFacility  (body {groupid, facid, lastdate})
router.post('/GetUpdatedPrescriptionDataFacility', asyncHandler(async (req, res) => {
  const b = req.body || {};
  res.json(await repo.getUpdatedPrescriptionDataFacility(b.groupid, b.facid, b.lastdate));
}));

// POST /api/PrescriptionData/GetPrescriptionDataByPatient?patient_id=
router.post('/GetPrescriptionDataByPatient', asyncHandler(async (req, res) => {
  res.json(await repo.getPrescriptionDataByPatient(req.query.patient_id));
}));

// POST /api/PrescriptionData/GetPrescriptionDataForMobileByPatient?patient_id=
router.post('/GetPrescriptionDataForMobileByPatient', asyncHandler(async (req, res) => {
  res.json(await repo.getPrescriptionDataForMobileByPatient(req.query.patient_id));
}));

// POST /api/PrescriptionData/Getdeliverysign?tran_id=&delivery_date=  → string
router.post('/Getdeliverysign', asyncHandler(async (req, res) => {
  res.json(await repo.getDeliverySign(req.query.tran_id, req.query.delivery_date));
}));

// POST /api/PrescriptionData/GetSplitPrescriptionDetailbyrxno?rx_no=
router.post('/GetSplitPrescriptionDetailbyrxno', asyncHandler(async (req, res) => {
  res.json(await repo.getSplitPrescriptionDetailByRxNo(req.query.rx_no));
}));

// POST /api/PrescriptionData/UpdateTransferPriscriptionDataByGroup?GroupID=&date=
router.post('/UpdateTransferPriscriptionDataByGroup', asyncHandler(async (req, res) => {
  res.json(await repo.updateTransferPrescriptionDataByGroup(req.query.GroupID, req.query.date));
}));

// POST /api/PrescriptionData/GetLatestPrescriptionbyOldTranID?external_prescription_id=
router.post('/GetLatestPrescriptionbyOldTranID', asyncHandler(async (req, res) => {
  res.json(await repo.getLatestPrescriptionByOldTranID(req.query.external_prescription_id));
}));

// POST /api/PrescriptionData/GetPrescriptionCountbyGroup?groupid=
router.post('/GetPrescriptionCountbyGroup', asyncHandler(async (req, res) => {
  res.json(await repo.getPrescriptionCountByGroup(req.query.groupid));
}));

module.exports = router;
