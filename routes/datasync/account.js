'use strict';

/** /api/Account — mirrors MetizDatasyncAPI AccountController. Parity (Phase 3). */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const accountRepo = require('../../repositories/accountRepo');

// POST /api/Account/GetPatientStatementPelham  (body = RequestAccountData, 22 fields)
router.post('/GetPatientStatementPelham', asyncHandler(async (req, res) => {
  res.json(await accountRepo.getPatientStatementPelham(req.body || {}));
}));

module.exports = router;
