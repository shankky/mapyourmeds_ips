'use strict';

/**
 * Generic DTO mapper — reproduces the .NET HelperEntityMap.MapToObject<T> +
 * JSON-serializer behavior exactly, so Express output is byte-for-byte
 * compatible with the legacy API.
 *
 * .NET behavior being matched:
 *   1. The result is shaped by the DTO class, NOT the raw SP columns. Output
 *      field NAMES + CASING + ORDER come from the DTO (e.g. SP column `address`
 *      → DTO property `Address` → JSON `"Address"`).
 *   2. DTO maps columns by name, CASE-INSENSITIVELY (MapToObject uses
 *      reader.HasColumn(prop.Name) with OrdinalIgnoreCase).
 *   3. Every DTO property is `string`, so ALL values serialize as strings
 *      ("external_facility_id":"1", not 1). DBNull → null (property left null).
 *   4. Fields the DTO declares but the SP doesn't return are emitted as null
 *      (e.g. Country, Email). This is why nulls must appear in the output.
 *
 * A "schema" here is just the ordered list of DTO field names. Map a raw ODBC
 * row to that schema: for each field, find the row's value by case-insensitive
 * key match; null/undefined → null; otherwise String(value).
 */

/** Build a case-insensitive lookup of a row's keys → actual key. */
function ciIndex(row) {
  const idx = {};
  for (const k of Object.keys(row)) idx[k.toLowerCase()] = k;
  return idx;
}

/**
 * Map one raw row to a DTO-shaped object.
 * @param {object} row    raw ODBC row (column-keyed)
 * @param {string[]} fields ordered DTO field names
 * @returns {object}
 */
function mapRow(row, fields) {
  const out = {};
  if (!row || typeof row !== 'object') {
    for (const f of fields) out[f] = null;
    return out;
  }
  const idx = ciIndex(row);
  for (const field of fields) {
    const srcKey = idx[field.toLowerCase()];
    const v = srcKey === undefined ? undefined : row[srcKey];
    out[field] = (v === null || v === undefined) ? null : String(v);
  }
  return out;
}

/**
 * Map an array of rows to DTO shape.
 * @param {Array<object>} rows
 * @param {string[]} fields
 * @returns {Array<object>}
 */
function mapRows(rows, fields) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => mapRow(r, fields));
}

/**
 * Map a single object (or first row) to DTO shape, or null if no row. Used for
 * endpoints whose .NET action returns a single DTO (FirstOrDefault).
 */
function mapSingle(rowOrRows, fields) {
  const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows;
  if (row === null || row === undefined) return null;
  return mapRow(row, fields);
}

module.exports = { mapRow, mapRows, mapSingle };
