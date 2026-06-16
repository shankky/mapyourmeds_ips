'use strict';

/**
 * Datasync API router group — the MetizDatasyncAPI-equivalent surface
 * (base path `/api`). Mounted in app.js. Matches the legacy behavior: no token
 * enforcement on datasync (IPS-004).
 *
 * Controller routers mount by exact controller-name segment (case-sensitive) so
 * the consumer's URLs match byte-for-byte, e.g. POST /api/Facility/GetAllFacility.
 *
 * Phase 2 (consumer-critical) controllers below. Phase 3 adds Account + the
 * remaining parity actions (many already present as parity handlers here).
 */

const express = require('express');
const router = express.Router();

router.use('/Account', require('./account'));
router.use('/Facility', require('./facility'));
router.use('/GetDataByID', require('./getDataById'));
router.use('/TaskManagement', require('./taskManagement'));
router.use('/PrescriptionData', require('./prescriptionData'));
router.use('/Cycle', require('./cycle'));
router.use('/RefillRequestData', require('./refillRequestData'));
router.use('/MedSheet', require('./medSheet'));
router.use('/DrugReceive', require('./drugReceive'));

module.exports = router;
