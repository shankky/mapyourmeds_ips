'use strict';

/**
 * Datasync API router group — the MetizDatasyncAPI-equivalent surface
 * (base path `/api`). Mounted in app.js. Individual controller routers are
 * added in Phase 2 (consumer-critical) and Phase 3 (parity):
 *   Account, Cycle, DrugReceive, Facility, GetDataByID, Login, MedSheet,
 *   PrescriptionData, RefillRequestData, TaskManagement.
 *
 * Matches the legacy behavior: no token enforcement on datasync (IPS-004).
 */

const express = require('express');
const router = express.Router();

// Phase 2 routers mount here, e.g.:
// router.use('/Facility', require('./facility'));
// router.use('/PrescriptionData', require('./prescriptionData'));
// ...

module.exports = router;
