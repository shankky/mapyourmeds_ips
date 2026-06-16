'use strict';

/**
 * Single source of truth for the 29 consumer-critical endpoints (what
 * mym/config/ips.class.js calls). Shared by smoke-endpoints.js and
 * parity-check.js so the two never drift.
 *
 * Each entry: { label, path, body }
 *   - path is relative (no leading /api needed by .NET; we add per-base).
 *   - sample inputs come from env (SMK_* / shared defaults).
 *
 * NOTE: paths here are written WITHOUT the leading "api/" so they can be
 * appended to either base:
 *   Express : http://host:3000/api/<path>
 *   .NET    : https://mymsync.mapyourmedsapi.com:5003/api/<path>
 */

const S = {
  facilityId: process.env.SMK_FACILITY_ID || '34',
  groupId: process.env.SMK_GROUP_ID || '371',
  drugId: process.env.SMK_DRUG_ID || '2116',
  doctorId: process.env.SMK_DOCTOR_ID || '-1',
  patientId: process.env.SMK_PATIENT_ID || '1966071',
  rxNo: process.env.SMK_RX || '50078646',
  fillId: process.env.SMK_FILL_ID || '1',
  ndc: process.env.SMK_NDC || '00093727198',
  date: process.env.SMK_DATE || '2024-07-25',
  startDate: process.env.SMK_START || '2024-07-01',
  endDate: process.env.SMK_END || '2024-07-31',
  startDt: process.env.SMK_START_DT || '2024-07-01 00:00:00',
  endDt: process.env.SMK_END_DT || '2024-07-31 23:59:59',
  createdDate: process.env.SMK_CREATED || '2024-07-25',
  firstname: process.env.SMK_FIRST || 'John',
  lastname: process.env.SMK_LAST || 'Smith',
};

const q = encodeURIComponent;

// label, path (relative to /api/), body
const ENDPOINTS = [
  ['getAllGroups', 'Facility/GetFacilityGroup', {}],
  ['getAllFacility', 'Facility/GetAllFacility', {}],
  ['getDrugByGroup', `GetDataByID?groupid=${q(S.groupId)}&drug_id=${q(S.drugId)}`, {}],
  ['getDoctorByGroup', `GetDataByID?groupid=${q(S.groupId)}&doctor_id=${q(S.doctorId)}`, {}],
  ['getPatientsByFacility', `TaskManagement/GetPatientByFacility?external_facility_id=${q(S.facilityId)}`, {}],
  ['getPatientsData', `TaskManagement/GetPatientData?firstname=${q(S.firstname)}&lastname=${q(S.lastname)}`, {}],
  ['getPatientByExternalId', `PrescriptionData/Getpatientbyinternalid?internalid=${q(S.patientId)}`, {}],
  ['getPrescriptionsByFacility', `PrescriptionData?external_facility_id=${q(S.facilityId)}`, {}],
  ['getPrescriptionsByGroupIdAndDate', 'PrescriptionData', { LastUpdatetime: S.date, groupid: S.groupId, wholeprofile: true }],
  ['getSplitPrescriptionsByFacility', `PrescriptionData/GetSplitPrescriptions?FacilityID=${q(S.facilityId)}`, {}],
  ['getPrescriptionDetailByRxNo', `PrescriptionData/Getprescriptiondetailbyrxno?rx_no=${q(S.rxNo)}`, {}],
  ['getPrescriptionByFillId', `PrescriptionData/GetPrescriptionByFillid?FillID=${q(S.fillId)}`, {}],
  ['getDrugFromDate', `PrescriptionData/GetDrugUpdate?date=${q(S.date)}`, {}],
  ['deliveryByPatientAndDate', `PrescriptionData/Getdeliverybypatientanddate?Patientid=${q(S.patientId)}&startdate=${q(S.startDate)}&enddate=${q(S.endDate)}`, {}],
  ['deliveryByFacilityAndDate', `PrescriptionData/Getdeliverybyfacilityanddate?facility=${q(S.facilityId)}&startdate=${q(S.startDate)}&enddate=${q(S.endDate)}`, {}],
  ['route4MeByDate', `PrescriptionData/GetRoute4MeDataByDate?startdatetime=${q(S.startDt)}&enddatetime=${q(S.endDt)}`, {}],
  ['prescriptionImagePath', `PrescriptionData/Getprescriptionimagepath?tran_id=${q(S.patientId)}`, {}],
  ['getCycleRx', 'Cycle/Getcyclerx_status', {}],
  ['getCycleInhospital', 'Cycle/Getcycle_Inhospital', {}],
  ['pvOneStepOne', `TaskManagement/PvoneSteponestatusByRxnumber?Rxnumber=${q(S.rxNo)}&Createddate=${q(S.createdDate)}`, {}],
  ['pvOneStepTwo', `TaskManagement/PvoneSteptwostatusByRxnumber?Rxnumber=${q(S.rxNo)}&Createddate=${q(S.createdDate)}`, {}],
  ['fillingStatus', `TaskManagement/FillingstatusByRxnumber?Rxnumber=${q(S.rxNo)}&Patientid=${q(S.patientId)}&Createddate=${q(S.createdDate)}`, {}],
  ['pvTwoStatus', `TaskManagement/PVstatusByRxnumber?Rxnumber=${q(S.rxNo)}&Patientid=${q(S.patientId)}&Createddate=${q(S.createdDate)}`, {}],
  ['manifestStatus', `TaskManagement/ManifeststatusByRxnumber?Rxnumber=${q(S.rxNo)}&Patientid=${q(S.patientId)}&Createddate=${q(S.createdDate)}`, {}],
  ['deliveryByPatient', `TaskManagement/DeliveryByPatient?Patient_id=${q(S.patientId)}`, {}],
  ['getWeeklyRefillReminder', 'RefillRequestData/GetWeeklyRefillReminder', {}],
  ['getMedPassData', `MedSheet/GeteMedPassData?date=${q(S.date)}`, {}],
  ['getPatientImagePath', `DrugReceive/Getpatientimagepath?patient_id=${q(S.patientId)}`, {}],
  ['getDrugImagePath', `DrugReceive/GetDrugimagepath?ndc=${q(S.ndc)}`, {}],
];

// Phase 3 parity endpoints (NOT called by the consumer; full datasync-host parity).
// Kept separate so the consumer smoke set stays exactly the 29 above.
const lastdate = process.env.SMK_LASTDATE || '2024-01-01';
const office = process.env.SMK_OFFICE || S.groupId;
const PARITY_EXTRA = [
  ['accountStatement', 'Account/GetPatientStatementPelham', {
    ad_from: S.startDate, ad_to: S.endDate, as_type: '', ae_account: '', as_start: '', as_end: '',
    ae_over30: '', ae_over60: '', ae_over90: '', as_autopost: '', ae_office_id: office, as_store: '',
    as_note: '', active_account: '', zero_copay: '', as_note1: '', as_note2: '', as_note3: '',
    as_openqueue: '', as_showfacility: '', as_method: '', as_zerocharges: '',
  }],
  ['updatedRxByFacility', 'PrescriptionData/GetUpdatedPrescriptionDataFacility', { groupid: S.groupId, facid: S.facilityId, lastdate: S.date }],
  ['rxByPatient', `PrescriptionData/GetPrescriptionDataByPatient?patient_id=${q(S.patientId)}`, {}],
  ['rxMobileByPatient', `PrescriptionData/GetPrescriptionDataForMobileByPatient?patient_id=${q(S.patientId)}`, {}],
  ['deliverySign', `PrescriptionData/Getdeliverysign?tran_id=${q(S.patientId)}&delivery_date=${q(S.date)}`, {}],
  ['splitRxDetailByRxNo', `PrescriptionData/GetSplitPrescriptionDetailbyrxno?rx_no=${q(S.rxNo)}`, {}],
  ['transferRxByGroup', `PrescriptionData/UpdateTransferPriscriptionDataByGroup?GroupID=${q(S.groupId)}&date=${q(S.date)}`, {}],
  ['latestRxByOldTranId', `PrescriptionData/GetLatestPrescriptionbyOldTranID?external_prescription_id=${q(S.rxNo)}`, {}],
  ['rxCountByGroup', `PrescriptionData/GetPrescriptionCountbyGroup?groupid=${q(S.groupId)}`, {}],
  ['techRphByRxNumber', `TaskManagement/GetTechrphByRxNumber?rx_iddata=${q(S.rxNo)}&patient_iddata=${q(S.patientId)}&filldate=${q(S.date)}`, {}],
  ['ipsDeliverySchedule', `TaskManagement/GetIPSDeliverySchedule?rx_iddata=${q(S.rxNo)}&patient_iddata=${q(S.patientId)}&orderdate=${q(S.date)}`, {}],
  ['dischargePatientByGroup', `TaskManagement/GetDischangePatientByGroup?external_group_id=${q(S.groupId)}&lastdate=${q(lastdate)}`, {}],
];

module.exports = { ENDPOINTS, PARITY_EXTRA, SAMPLES: S };
