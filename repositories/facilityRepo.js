'use strict';

/**
 * Facility data access — mirrors DataService/FacilityDataService.cs.
 * All calls are parameterized stored-proc calls against the IPS pool.
 */

const { callProc } = require('../db/queryHelper');

/** sp_mym_getfacilitygroup → ImportAllFacilityGroup[] (group_id, description) */
function getFacilityGroups() {
  return callProc('sp_mym_getfacilitygroup', []);
}

/** sp_mym_getallfacilitydataALL → ImportAllFacility[] */
function getAllFacilities() {
  return callProc('sp_mym_getallfacilitydataALL', []);
}

/** sp_mym_getallfacilitydata(groupid) → ImportFacility[] (parity; not consumer-critical) */
function getAllFacilitiesByGroupId(groupid) {
  return callProc('sp_mym_getallfacilitydata', [groupid]);
}

module.exports = { getFacilityGroups, getAllFacilities, getAllFacilitiesByGroupId };
