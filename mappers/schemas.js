'use strict';

/**
 * DTO field schemas — the ordered field list the .NET API emits per endpoint.
 *
 * Source of truth: captured live from the .NET API
 * (https://mymsync.mapyourmedsapi.com:5003) on 2026-06-11 via the field-dump.
 * Endpoints that returned an empty array in that dump (so no runtime fields)
 * use the C# DTO definition from the source repo / memory-bank; those are
 * marked DTO-SOURCE and should be re-verified once non-empty data is available.
 *
 * Field ORDER matters (matched against .NET JSON property order). Every value
 * is stringified by the mapper (DTO props are all `string`), nulls preserved.
 */

// --- Facility ---------------------------------------------------------------
const ImportAllFacility = [
  'FacilityName', 'external_facility_id', 'Address', 'Address2', 'City', 'State',
  'Country', 'Zip', 'MobileNumber', 'Email', 'Fax', 'group_id', 'active', 'store_id',
];
const ImportFacility = [ // GetAllFacilityByGroupID / GetUpdatedFacilityData (DTO-SOURCE)
  'FacilityName', 'external_facility_id', 'Address', 'Address2', 'City', 'State',
  'Country', 'Zip', 'MobileNumber', 'Email', 'Fax',
];
const ImportAllFacilityGroup = ['group_id', 'description'];

// --- Doctor / Drug ----------------------------------------------------------
const ImportDoctor = [ // DTO-SOURCE (getDoctorByGroup returned null in dump)
  'external_doctor_id', 'firstname', 'lastname', 'address', 'address2', 'city',
  'state', 'zip', 'gender', 'phone', 'fax', 'dea', 'npi_number',
];
const ImportDurg = [ // getDrugByGroup (live)
  'drug_id', 'drug', 'strength_value', 'strength', 'ndc', 'generic', 'brand_drug',
  'drug_form', 'caution1', 'caution2', 'caution3', 'CFI', 'ingredient_id',
  'brand_flag', 'pack_size', 'color', 'shape', 'active', 'flavor', 'imprint',
  'drug_class_group', 'df_id', 'drug_25', 'drug_60', 'drug_schedule', 'drug_subtype',
];
const DrugUpdateModel = [ // getDrugFromDate (live)
  'drug_id', 'drug', 'strength_value', 'strength', 'ndc', 'generic', 'brand_drug',
  'drug_form', 'caution1', 'caution2', 'caution3', 'CFI', 'drug_form_generic',
  'ingredient_id', 'brand_flag', 'pack_size', 'color', 'active', 'shape', 'flavor',
  'imprint', 'drug_class_group', 'df_id', 'drug_25', 'drug_60', 'drug_schedule', 'drug_subtype',
];

// --- Patients (task) --------------------------------------------------------
const ImportPatientTask = [ // getPatientsByFacility / getPatientsData (live: getPatientsData)
  'external_patient_id', 'external_facility_id', 'external_facility_name', 'firstname',
  'lastname', 'middlename', 'gender', 'dob', 'ssno', 'phone', 'fax', 'allergy',
];
const ImportPatientInternalTask = [ // getPatientByExternalId (live)
  'external_patient_id', 'external_facility_id', 'external_facility_name', 'firstname',
  'lastname', 'middlename', 'gender', 'dob', 'ssno', 'phone', 'fax', 'allergy',
  'address', 'city', 'state', 'zipid', 'patient_active_flag', 'facility_active_flag',
];

// --- Prescriptions ----------------------------------------------------------
const ImportPrescription = [ // getPrescriptionsByGroupIdAndDate / byFacility (live: byGroup)
  'external_patient_id', 'external_facility_id', 'external_doctor_id', 'external_drug_id',
  'external_prescription_id', 'pharmacy_order_id', 'drug', 'strength_value', 'strength',
  'ndc', 'prescribe_date', 'sig_code', 'sig_english', 'original_qty', 'qty', 'days_supply',
  'no_of_refill', 'Remain_Refill', 'morning', 'noon', 'evening', 'night', 'start_date',
  'stop_date', 'med_type', 'daw', 'origin_code', 'is_active', 'mar_flag', 'tar_flag',
  'po_flag', 'last_tran_id', 'discontinue_date', 'discontinue_note', 'rx_expire_date',
  'last_qty_approved', 'last_qty_billed', 'last_delivered_date', 'last_pickedup_date',
  'ltc_last_filled_qty', 'tran_date', 'drug_written_drug_id',
];
const ImportPrescriptionDaily = [ // getPrescriptionDetailByRxNo (live) — note .NET typo `docter_name`
  'external_patient_id', 'external_facility_id', 'external_doctor_id', 'external_drug_id',
  'external_prescription_id', 'pharmacy_order_id', 'drug', 'strength_value', 'strength',
  'ndc', 'prescribe_date', 'sig_code', 'sig_english', 'original_qty', 'qty', 'days_supply',
  'no_of_refill', 'morning', 'noon', 'evening', 'night', 'start_date', 'stop_date',
  'med_type', 'daw', 'origin_code', 'is_active', 'mar_flag', 'tar_flag', 'po_flag',
  'last_tran_id', 'discontinue_date', 'discontinue_note', 'rx_expire_date', 'docter_name',
  'patient_name', 'is_verify', 'Remain_Refill', 'drug_written_drug_id',
];
const SplitPrescriptionsModel = [ // getSplitPrescriptionsByFacility (DTO-SOURCE)
  'prescription_internal_id', 'rx_id', 'patient_id', 'sr_id', 'sig', 'med_type',
  'hoa1', 'hoa1_qty', 'hoa2', 'hoa2_qty', 'hoa3', 'hoa3_qty', 'hoa4', 'hoa4_qty',
  'hoa5', 'hoa5_qty', 'hoa6', 'hoa6_qty', 'hoa7', 'hoa7_qty', 'hoa8', 'hoa8_qty',
];
const Prescription_By_Fillid = [ // getPrescriptionByFillId (DTO-SOURCE) — same as ImportPrescriptionDaily + transfer fields
  'external_patient_id', 'external_facility_id', 'external_doctor_id', 'external_drug_id',
  'external_prescription_id', 'pharmacy_order_id', 'drug', 'strength_value', 'strength',
  'ndc', 'prescribe_date', 'sig_code', 'sig_english', 'original_qty', 'qty', 'days_supply',
  'no_of_refill', 'morning', 'noon', 'evening', 'night', 'start_date', 'stop_date',
  'med_type', 'daw', 'origin_code', 'is_active', 'mar_flag', 'tar_flag', 'po_flag',
  'last_tran_id', 'discontinue_date', 'discontinue_note', 'rx_expire_date', 'patient_name',
  'is_verify', 'Remain_Refill', 'drug_written_drug_id', 'office_id', 'transfer_to', 'transfer_by_office',
];

// --- Deliveries / logistics -------------------------------------------------
const TransactionHistory = [ // deliveryByPatientAndDate / deliveryByFacilityAndDate / deliveryByPatient (live)
  'tran_id', 'patient', 'drug', 'Order_status', 'created_date', 'delivery_date', 'qty',
  'delivery_no', 'rx_id', 'prescribe_date', 'sig_code', 'sig_english', 'cycle_flag',
  'stop_date', 'med_type', 'Doctor_first', 'Doctor_last', 'Remain_Refill',
];
const GetRoute4MeDataModel = [ // route4MeByDate (live)
  'address', 'Route', 'is_depot', 'Alias', 'Address_stop_type', 'First_name', 'Last_name',
  'phone', 'email', 'group', 'Pieces', 'Revenue', 'Service_time', 'time_window_start',
  'time_window_end', 'Del_type', 'priority', 'delivery_date', 'Internal_facility_id',
  'Internal_patient_id', 'no_of_patient', 'delivery_store_id', 'delivery_to', 'delivery_schedule',
  'patient_facility_id', 'PATIENT_FACILITY_STORE_ID', 'PATIENT_FACILITY_NOOFPATIENT', 'aka',
  'delivery_tran_id', 'created_date', 'TOBE_DELIVERED_DATETIME', 'delivery_note',
];

// --- Cycles -----------------------------------------------------------------
const ModelCycleStatus = [ // getCycleRx (live)
  'srno', 'Next_cycle_start_date', 'Patient_last', 'Patient_first', 'patient_dob',
  'doctor_first', 'doctor_last', 'doctor_phone', 'pr_tran_id', 'rx_id', 'drug',
  'rx_expire_date', 'Remaining_Refill', 'Rx_Status', 'bill_status', 'fill_status',
  'check_status', 'delivery_status', 'Days_supply', 'Robot', 'dr_call_status',
  'External_Patient_id', 'gender', 'hold',
];
const ModelHospitalPatientDrugDetail = [ // getCycleInhospital (live)
  'srno', 'Next_cycle_start_date', 'days_supply', 'robot', 'Patient_last', 'Patient_first',
  'patient_dob', 'doctor_first', 'doctor_last', 'doctor_phone', 'pr_tran_id', 'rx_id',
  'drug', 'rx_expire_date', 'Remaining_Refill', 'Rx_Status', 'bill_status', 'fill_status',
  'check_status', 'delivery_status',
];
const PvoneSteptwo = ['claim_status', 'bill_date']; // pvOneStepTwo (live)

// --- Refill / MedSheet ------------------------------------------------------
const ModelGetWeeklyRefillReminder = [ // getWeeklyRefillReminder (live)
  'Patient_Internal_id', 'Patient_firstname', 'Patient_lastname', 'Pateint_dob',
  'Facility_Internal_id', 'Facility_Name', 'Facility_Group_id', 'Facility_Group',
  'Facility_Phone', 'Facility_Fax', 'Prescription_Internal_id', 'Rx_id', 'Drug',
  'rx_expire_date', 'Remaining_Refill', 'last_delivered', 'days_supply', 'qty_filled',
  'next_refill', 'external_doctor_id', 'docter_name', 'doctor_phone', 'prescribe_date',
  'sig_code', 'sig_english', 'cycle_flag', 'stop_date', 'med_type', 'qty',
];
const PatientMedPassModel = [ // getMedPassData (live)
  'tran_id', 'dose_date', 'patient_id', 'facility_id', 'dose_time', 'dose_qty', 'dose_status',
  'note', 'updated_by', 'updated_date', 'dose_given_time', 'dose_given_date', 'med_type',
  'sig_code', 'sig_detail', 'internal_rx_id', 'rx_number', 'drug', 'patient_last',
  'patient_first', 'dob', 'gender', 'ndc', 'last_tran_id',
];

module.exports = {
  ImportAllFacility,
  ImportFacility,
  ImportAllFacilityGroup,
  ImportDoctor,
  ImportDurg,
  DrugUpdateModel,
  ImportPatientTask,
  ImportPatientInternalTask,
  ImportPrescription,
  ImportPrescriptionDaily,
  SplitPrescriptionsModel,
  Prescription_By_Fillid,
  TransactionHistory,
  GetRoute4MeDataModel,
  ModelCycleStatus,
  ModelHospitalPatientDrugDetail,
  PvoneSteptwo,
  ModelGetWeeklyRefillReminder,
  PatientMedPassModel,
};
