'use strict';

/**
 * Facility data access — mirrors DataService/FacilityDataService.cs.
 * All calls are parameterized stored-proc calls against the IPS pool.
 * Output is shaped to the .NET DTO (field names/casing/order, null fields,
 * stringified values) via mappers/dtoMapper for byte-for-byte parity.
 */

const { callProc } = require('../db/queryHelper');
const { mapRows } = require('../mappers/dtoMapper');
const S = require('../mappers/schemas');

/** sp_mym_getfacilitygroup → ImportAllFacilityGroup[] (group_id, description) */
async function getFacilityGroups() {
  return mapRows(await callProc('sp_mym_getfacilitygroup', []), S.ImportAllFacilityGroup);
}

/** sp_mym_getallfacilitydataALL → ImportAllFacility[] */
async function getAllFacilities() {
  return mapRows(await callProc('sp_mym_getallfacilitydataALL', []), S.ImportAllFacility);
}

/** sp_mym_getallfacilitydata(groupid) → ImportFacility[] (parity; not consumer-critical) */
async function getAllFacilitiesByGroupId(groupid) {
  return mapRows(await callProc('sp_mym_getallfacilitydata', [groupid]), S.ImportFacility);
}

module.exports = { getFacilityGroups, getAllFacilities, getAllFacilitiesByGroupId };
