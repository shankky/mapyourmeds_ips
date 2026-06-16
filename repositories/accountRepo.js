'use strict';

/**
 * Account data access — mirrors DataService/AccountService.cs
 * (MetizDatasyncAPI AccountController). Parity (not consumer-called).
 *
 * sp_mym_patient_statement takes 22 ordered params from RequestAccountData.
 * The .NET code concatenated them in this exact order — preserved here as a
 * parameterized CALL. Output shaped to ModelAccountResponse DTO.
 */

const { callProc } = require('../db/queryHelper');
const { mapRows } = require('../mappers/dtoMapper');
const S = require('../mappers/schemas');

// Exact param order from AccountService.GetPatientStatementPelham.
const PARAM_ORDER = [
  'ad_from', 'ad_to', 'as_type', 'ae_account', 'as_start', 'as_end',
  'ae_over30', 'ae_over60', 'ae_over90', 'as_autopost', 'ae_office_id', 'as_store',
  'as_note', 'active_account', 'zero_copay', 'as_note1', 'as_note2', 'as_note3',
  'as_openqueue', 'as_showfacility', 'as_method', 'as_zerocharges',
];

/** sp_mym_patient_statement(...22 params...) → ModelAccountResponse[] */
async function getPatientStatementPelham(body) {
  const b = body || {};
  const params = PARAM_ORDER.map((k) => (b[k] === undefined || b[k] === null ? '' : b[k]));
  const rows = await callProc('sp_mym_patient_statement', params);
  return mapRows(rows, S.ModelAccountResponse);
}

module.exports = { getPatientStatementPelham };
