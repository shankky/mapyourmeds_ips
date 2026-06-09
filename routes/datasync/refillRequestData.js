'use strict';

/** /api/RefillRequestData — mirrors MetizDatasyncAPI RefillRequestDataController. */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const refillRepo = require('../../repositories/refillRepo');

// POST /api/RefillRequestData/GetWeeklyRefillReminder  (client: getWeeklyRefillReminder)
router.post('/GetWeeklyRefillReminder', asyncHandler(async (req, res) => {
  res.json(await refillRepo.getWeeklyRefillReminder());
}));

// --- parity ---------------------------------------------------------------
router.post('/GetRefillRequestLog', asyncHandler(async (req, res) => res.json(await refillRepo.getRefillRequestLog())));
router.post('/GetDelivery_TobeDelivered', asyncHandler(async (req, res) => res.json(await refillRepo.getDeliveryToBeDelivered())));
router.post('/GetNewRx_TobeDelivered', asyncHandler(async (req, res) => res.json(await refillRepo.getNewRxToBeDelivered())));
router.post('/GetPartialPrescriptionbyFacility', asyncHandler(async (req, res) => res.json(await refillRepo.getPartialPrescriptionByFacility(req.query.facility_idd))));

module.exports = router;
