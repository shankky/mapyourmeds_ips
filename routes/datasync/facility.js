'use strict';

/**
 * /api/Facility — mirrors MetizDatasyncAPI FacilityController.
 * All POST (legacy verbs preserved). Mounted at /api/Facility.
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const facilityRepo = require('../../repositories/facilityRepo');

// POST /api/Facility/GetFacilityGroup   (client: getAllGroups)
router.post('/GetFacilityGroup', asyncHandler(async (req, res) => {
  res.json(await facilityRepo.getFacilityGroups());
}));

// POST /api/Facility/GetAllFacility     (client: getAllFacility)
router.post('/GetAllFacility', asyncHandler(async (req, res) => {
  res.json(await facilityRepo.getAllFacilities());
}));

// POST /api/Facility/GetAllFacilityByGroupID?groupid=   (parity)
router.post('/GetAllFacilityByGroupID', asyncHandler(async (req, res) => {
  res.json(await facilityRepo.getAllFacilitiesByGroupId(req.query.groupid));
}));

module.exports = router;
