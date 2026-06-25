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

/**
 * .NET date formatting parity.
 *
 * The ODBC driver returns datetime columns as ISO-ish strings:
 *   date:     "1956-02-22"
 *   datetime: "2024-07-25 00:00:00.000000"
 * but the legacy .NET API serializes its DateTime DTO fields in the server's
 * US culture as:  M/d/yyyy h:mm:ss tt   →  "2/22/1956 12:00:00 AM",
 *                                          "7/25/2024 12:00:00 AM"
 * Consumers feed these strings back into queries, so the format must match
 * .NET exactly (the raw ISO string is rejected downstream).
 *
 * We detect an ISO date / datetime VALUE and reformat it. Non-date strings
 * (ids, ndc, codes) never match the pattern, so they pass through untouched.
 */

// "YYYY-MM-DD" optionally followed by " HH:MM:SS" and optional ".ffffff"
const ISO_DT = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?)?$/;

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

/** Format Y/M/D + H/M/S parts into .NET "M/d/yyyy h:mm:ss tt". */
function toDotNetDate(y, mo, d, h, mi, s) {
  const ampm = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12; if (h12 === 0) h12 = 12; // 0 -> 12 (AM), 12 -> 12 (PM)
  // .NET: no leading zero on month/day/hour; zero-padded minutes/seconds.
  return `${mo}/${d}/${y} ${h12}:${pad2(mi)}:${pad2(s)} ${ampm}`;
}

/**
 * If `s` looks like an ISO date/datetime, return the .NET-formatted string;
 * otherwise return `s` unchanged.
 */
function formatIfDate(s) {
  const m = ISO_DT.exec(s);
  if (!m) return s;
  const y = +m[1], mo = +m[2], d = +m[3];
  const h = m[4] !== undefined ? +m[4] : 0;
  const mi = m[5] !== undefined ? +m[5] : 0;
  const sec = m[6] !== undefined ? +m[6] : 0;
  return toDotNetDate(y, mo, d, h, mi, sec);
}

/** Build a case-insensitive lookup of a row's keys → actual key. */
function ciIndex(row) {
  const idx = {};
  for (const k of Object.keys(row)) idx[k.toLowerCase()] = k;
  return idx;
}

/** Stringify a raw ODBC value the way .NET would: dates → US culture, else String(). */
function dotNetStringify(v) {
  // odbc usually returns datetimes as strings; handle a JS Date defensively too.
  if (v instanceof Date && !isNaN(v.getTime())) {
    return toDotNetDate(v.getFullYear(), v.getMonth() + 1, v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds());
  }
  const s = String(v);
  return formatIfDate(s);
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
    out[field] = (v === null || v === undefined) ? null : dotNetStringify(v);
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

module.exports = { mapRow, mapRows, mapSingle, dotNetStringify, formatIfDate };
