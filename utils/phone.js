'use strict';

/**
 * Phone/fax formatting — mirrors the .NET BusinessModel mappers
 * (PatientBOResponse.create / PrescriptionBOResponse.create), where the DB
 * stores each number as separate component columns (Phone11..Phone14, etc.).
 *
 * Legacy behavior reproduced exactly:
 *   - Phone: "p1-p2-p3" and, when an extension (p4) is present, append " x p4".
 *   - Returns "" (empty string) when the first component is empty/null —
 *     same as the C# `string.IsNullOrEmpty(Phone11) ? "" : ...`.
 *   - Fax: "f1-f2-f3" when the first component is present, else "".
 *
 * NOTE: the .NET work-phone mapper had a bug (used Phone33 twice, dropped
 * Phone32). This helper takes the 4 components correctly; callers pass
 * (Phone31, Phone32, Phone33, Phone34). Bug-fix decision tracked as IPS-006.
 */

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

/**
 * Format a phone number from up to 4 components (area, prefix, line, ext).
 * @returns {string} "" when p1 is empty.
 */
function formatPhone(p1, p2, p3, ext) {
  if (isEmpty(p1)) return '';
  let s = `${p1}-${p2}-${p3}`;
  if (!isEmpty(ext)) s += ` x ${ext}`;
  return s;
}

/**
 * Format a fax number from 3 components.
 * @returns {string} "" when f1 is empty.
 */
function formatFax(f1, f2, f3) {
  if (isEmpty(f1)) return '';
  return `${f1}-${f2}-${f3}`;
}

module.exports = { formatPhone, formatFax, isEmpty };
