'use strict';

/** /api/MedSheet — mirrors MetizDatasyncAPI MedSheetController. */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const medSheetRepo = require('../../repositories/medSheetRepo');

// POST /api/MedSheet/GeteMedPassData?date=   (client: getMedPassData)
router.post('/GeteMedPassData', asyncHandler(async (req, res) => {
  res.json(await medSheetRepo.getEMedPassData(req.query.date));
}));

// --- parity ---------------------------------------------------------------
router.post('/GetPatientMedSheetReport', asyncHandler(async (req, res) => {
  const { ae_patient_id, ad_startdate, ae_office, ad_enddate } = req.query;
  res.json(await medSheetRepo.getPatientMedSheetReport(ae_patient_id, ad_startdate, ae_office, ad_enddate));
}));
router.post('/GetIPSInternalPatientid', asyncHandler(async (req, res) => {
  res.json(await medSheetRepo.getIPSInternalPatientId(req.query.patientexternalid));
}));
router.post('/GetProfileChangedPatientByGroup', asyncHandler(async (req, res) => {
  const { groupid, facilityid, lastdate } = req.query;
  res.json(await medSheetRepo.getProfileChangedPatientByGroup(groupid, facilityid, lastdate));
}));
router.post('/GetPrescriptionDataByRxNumber', asyncHandler(async (req, res) => {
  res.json(await medSheetRepo.getPrescriptionDataByRxNumber(req.query.rxnumber));
}));
router.post('/GetChangedPrescriptionByPatient', asyncHandler(async (req, res) => {
  res.json(await medSheetRepo.getChangedPrescriptionByPatient(req.query.patientid));
}));

module.exports = router;
