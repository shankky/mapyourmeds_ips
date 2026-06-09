'use strict';

/** /api/DrugReceive — mirrors MetizDatasyncAPI DrugReceiveController. */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const drugReceiveRepo = require('../../repositories/drugReceiveRepo');

// POST /api/DrugReceive/Getpatientimagepath?patient_id=  → string  (client: getPatientImagePath)
router.post('/Getpatientimagepath', asyncHandler(async (req, res) => {
  res.json(await drugReceiveRepo.getPatientImagePath(req.query.patient_id));
}));

// POST /api/DrugReceive/GetDrugimagepath?ndc=  → string  (client: getDrugImagePath)  [DRUG pool]
router.post('/GetDrugimagepath', asyncHandler(async (req, res) => {
  res.json(await drugReceiveRepo.getDrugImagePath(req.query.ndc));
}));

// --- parity ---------------------------------------------------------------
router.post('/Getdeliverylist', asyncHandler(async (req, res) => {
  const body = req.body || {};
  res.json(await drugReceiveRepo.getDeliveryList(body.deliveryno, body.facilityid));
}));
router.post('/Getsystempath', asyncHandler(async (req, res) => res.json(await drugReceiveRepo.getSystemPath())));
router.post('/Getdeliverynobyfacility', asyncHandler(async (req, res) => res.json(await drugReceiveRepo.getDeliveryNoByFacility(req.query.facilityid))));
router.post('/GetDeliveryPendingList', asyncHandler(async (req, res) => res.json(await drugReceiveRepo.getDeliveryPendingList(req.query.facilityid))));
router.post('/GetDrugDescription', asyncHandler(async (req, res) => res.json(await drugReceiveRepo.getDrugDescription(req.query.ndc))));

module.exports = router;
