'use strict';

/**
 * Minimal structured logger — replaces DataService/Logger.cs (which appended to
 * log.txt and was used to swallow DB errors silently).
 *
 * Dependency-free (console-based) to keep the on-prem footprint small. Honors
 * LOG_LEVEL (error | warn | info | debug). Swap for pino/winston later if the
 * client wants log shipping — callers use this interface so that's a 1-file change.
 *
 * Note: env.js requires this module, so logger must NOT require env.js (avoid a
 * circular dependency). It reads LOG_LEVEL directly from process.env.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

function ts() {
  // ISO timestamp; avoids Date formatting deps.
  return new Date().toISOString();
}

function emit(level, args) {
  if (LEVELS[level] > currentLevel) return;
  const line = `${ts()} [${level.toUpperCase()}]`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(line, ...args);
}

module.exports = {
  error: (...a) => emit('error', a),
  warn: (...a) => emit('warn', a),
  info: (...a) => emit('info', a),
  debug: (...a) => emit('debug', a),
};
