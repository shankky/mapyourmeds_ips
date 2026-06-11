'use strict';

/**
 * Guard: enforce a SINGLE database-access path (H4 hardening).
 *
 * All DB access must go through db/queryHelper.js (executeQuery / callProc /
 * helpers), which is the only place that:
 *   - calls pool.query with the correct (sql, params) signature,
 *   - logs/records errors (no silent failures),
 *   - applies the swallow-vs-strict policy consistently.
 *
 * Direct `pool.query(...)` / `connection.query(...)` / `odbc.connect(...)`
 * anywhere else re-introduces the exact bug that returned []/silent failures.
 * This script greps the codebase and FAILS (exit 1) if it finds such calls
 * outside the allowed files. Wire into `npm run lint:db` and the deploy gate.
 *
 * No dependencies — runs anywhere Node runs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ALLOWED = new Set([
  'db/queryHelper.js', // the one sanctioned place for pool.query
  'db/pool.js', // creates the pool + runs connectionInitSql
  'db/selfTest.js', // uses executeQuery/callProc (allowed) — listed for clarity
  'scripts/check-db-access.js', // this guard's own pattern/doc text
]);
// Directories to skip entirely.
const SKIP_DIRS = new Set(['node_modules', '.git', 'build', 'public', 'views', 'postman']);

// Patterns that indicate a raw DB call bypassing the helper.
const PATTERNS = [
  /\.query\s*\(/, // pool.query( / connection.query(
  /odbc\.connect\s*\(/, // odbc.connect(
  /odbc\.pool\s*\(/, // odbc.pool( (only db/pool.js should do this)
  /require\(['"]odbc['"]\)/, // importing odbc directly
];

function walk(dir, files) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (name.endsWith('.js')) files.push(full);
  }
  return files;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

const violations = [];
for (const file of walk(ROOT, [])) {
  const relPath = rel(file);
  if (ALLOWED.has(relPath)) continue;
  // Skip the guard script itself and other scripts that legitimately need raw
  // access for diagnostics (smoke-test connects via queryHelper already; allow
  // scripts/ only if they go through queryHelper — but flag raw odbc use).
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // ignore comments
    const code = line.replace(/\/\/.*$/, '');
    for (const pat of PATTERNS) {
      if (pat.test(code)) {
        violations.push({ file: relPath, line: i + 1, text: line.trim() });
        break;
      }
    }
  });
}

if (violations.length) {
  console.error('✗ DB-access guard FAILED — raw DB calls found outside db/queryHelper.js:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.text}`);
  }
  console.error('\nRoute all DB access through db/queryHelper.js (executeQuery / callProc / helpers).');
  console.error('If a file legitimately needs raw access, add it to ALLOWED in scripts/check-db-access.js.');
  process.exit(1);
}

console.log('✓ DB-access guard passed — all DB access goes through db/queryHelper.js');
process.exit(0);
