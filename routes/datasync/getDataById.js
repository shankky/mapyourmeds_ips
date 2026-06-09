'use strict';

/**
 * /api/GetDataByID — mirrors MetizDatasyncAPI GetDataByIDController.
 *
 * BARE-CONTROLLER BRANCHING: in .NET these 4 actions had no [Route] attribute,
 * so Web API selected the action by which query-string params were present.
 * The client calls the bare controller URL, e.g.:
 *   POST /api/GetDataByID?groupid=371&drug_id=2116    → GetUpdatedDrugData
 *   POST /api/GetDataByID?groupid=166&doctor_id=-1    → GetUpdatedDoctorData
 * Express can't auto-select, so we branch here on the present query params.
 * Order of checks mirrors the distinguishing param (drug_id / doctor_id /
 * patient_id / external_facility_id).
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const repo = require('../../repositories/getDataByIdRepo');

router.post('/', asyncHandler(async (req, res) => {
  const q = req.query;
  const groupid = q.groupid;

  if (q.drug_id !== undefined) {           // client: getDrugByGroup
    return res.json(await repo.getUpdatedDrugData(groupid, q.drug_id));
  }
  if (q.doctor_id !== undefined) {         // client: getDoctorByGroup
    return res.json(await repo.getUpdatedDoctorData(groupid, q.doctor_id));
  }
  if (q.patient_id !== undefined) {        // parity (GetUpdatedPatientData)
    return res.json(await repo.getUpdatedPatientData(groupid, q.patient_id));
  }
  if (q.external_facility_id !== undefined) { // parity (GetUpdatedFacilityData)
    return res.json(await repo.getUpdatedFacilityData(groupid, q.external_facility_id));
  }

  const err = new Error('GetDataByID requires one of: drug_id, doctor_id, patient_id, external_facility_id');
  err.status = 400;
  err.expose = true;
  throw err;
}));

module.exports = router;
