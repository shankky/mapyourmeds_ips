'use strict';

/**
 * Core API router group — the SuiterxWebAPI-equivalent surface
 * (Login, Patient, Prescription, Drug), base path `/api`. Mounted in app.js.
 * Routes + JWT auth (requireAuth on all but Login) are added in Phase 4.
 */

const express = require('express');
const router = express.Router();

// Phase 4 routers mount here, e.g.:
// router.use('/Login', require('./login'));
// router.use('/Patient', require('./patient'));
// ...

module.exports = router;
