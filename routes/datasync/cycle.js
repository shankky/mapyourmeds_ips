'use strict';

/** /api/Cycle — mirrors MetizDatasyncAPI CycleController. */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const cycleRepo = require('../../repositories/cycleRepo');

// POST /api/Cycle/Getcyclerx_status   (client: getCycleRx)
router.post('/Getcyclerx_status', asyncHandler(async (req, res) => {
  res.json(await cycleRepo.getCycleRxStatus());
}));

// POST /api/Cycle/Getcycle_Inhospital  (client: getCycleInhospital)
router.post('/Getcycle_Inhospital', asyncHandler(async (req, res) => {
  res.json(await cycleRepo.getCycleInhospital());
}));

// --- parity ---------------------------------------------------------------
router.post('/Getcyclerx_7days', asyncHandler(async (req, res) => res.json(await cycleRepo.getCycleRx7days())));
router.post('/Getcyclerx_14days', asyncHandler(async (req, res) => res.json(await cycleRepo.getCycleRx14days())));
router.post('/Getcyclerx_21days', asyncHandler(async (req, res) => res.json(await cycleRepo.getCycleRx21days())));
router.post('/Getdeliverydriverfor2days', asyncHandler(async (req, res) => res.json(await cycleRepo.getDeliveryDriverFor2Days())));
router.post('/Getpv2statusbyrx', asyncHandler(async (req, res) => res.json(await cycleRepo.getPv2StatusByRx(req.query.rx_id))));
router.post('/Getbilledstatusbyrx', asyncHandler(async (req, res) => res.json(await cycleRepo.getBilledStatusByRx(req.query.rx_id))));

module.exports = router;
