'use strict';

/**
 * /api/TaskManagement — mirrors MetizDatasyncAPI TaskManagementController.
 * Query-param names are case-sensitive and match the client exactly
 * (Rxnumber, Patientid, Createddate, Patient_id, external_facility_id).
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const taskRepo = require('../../repositories/taskRepo');

// POST /api/TaskManagement/GetPatientByFacility?external_facility_id=
router.post('/GetPatientByFacility', asyncHandler(async (req, res) => {
  res.json(await taskRepo.getPatientByFacility(req.query.external_facility_id));
}));

// POST /api/TaskManagement/GetPatientData?firstname=&lastname=
router.post('/GetPatientData', asyncHandler(async (req, res) => {
  res.json(await taskRepo.getPatientData(req.query.firstname, req.query.lastname));
}));

// POST /api/TaskManagement/FillingstatusByRxnumber?Rxnumber=&Patientid=&Createddate=  → bool
router.post('/FillingstatusByRxnumber', asyncHandler(async (req, res) => {
  const { Rxnumber, Patientid, Createddate } = req.query;
  res.json(await taskRepo.fillingStatusByRxNumber(Rxnumber, Patientid, Createddate));
}));

// POST /api/TaskManagement/PVstatusByRxnumber?Rxnumber=&Patientid=&Createddate=  → bool
router.post('/PVstatusByRxnumber', asyncHandler(async (req, res) => {
  const { Rxnumber, Patientid, Createddate } = req.query;
  res.json(await taskRepo.pvStatusByRxNumber(Rxnumber, Patientid, Createddate));
}));

// POST /api/TaskManagement/ManifeststatusByRxnumber?Rxnumber=&Patientid=&Createddate=  → string
router.post('/ManifeststatusByRxnumber', asyncHandler(async (req, res) => {
  const { Rxnumber, Patientid, Createddate } = req.query;
  res.json(await taskRepo.manifestStatusByRxNumber(Rxnumber, Patientid, Createddate));
}));

// POST /api/TaskManagement/PvoneSteponestatusByRxnumber?Rxnumber=&Createddate=  → bool
router.post('/PvoneSteponestatusByRxnumber', asyncHandler(async (req, res) => {
  const { Rxnumber, Createddate } = req.query;
  res.json(await taskRepo.pvOneStepOneStatusByRxNumber(Rxnumber, Createddate));
}));

// POST /api/TaskManagement/PvoneSteptwostatusByRxnumber?Rxnumber=&Createddate=  → PvoneSteptwo[]
router.post('/PvoneSteptwostatusByRxnumber', asyncHandler(async (req, res) => {
  const { Rxnumber, Createddate } = req.query;
  res.json(await taskRepo.pvOneStepTwoStatusByRxNumber(Rxnumber, Createddate));
}));

// POST /api/TaskManagement/DeliveryByPatient?Patient_id=  → PatientDelivery[]
router.post('/DeliveryByPatient', asyncHandler(async (req, res) => {
  res.json(await taskRepo.deliveryByPatient(req.query.Patient_id));
}));

module.exports = router;
