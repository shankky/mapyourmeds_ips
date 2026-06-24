'use strict';

/**
 * DB keepalive (idle-connection guard).
 *
 * Problem: after the app sits idle for hours/days, SQL Anywhere (idle timeout)
 * or the network/firewall drops the pooled connections. The next real request
 * then fails ("[odbc] Error executing the sql statement"). The queryHelper
 * retry recovers from that, but a request still fails first.
 *
 * This proactively runs a tiny `SELECT 1` on an interval so pooled connections
 * never go idle long enough to be dropped — keeping the very first user request
 * healthy too. It goes through executeQuery, which itself self-heals (recreates
 * the pool) if a connection was already dead, so the keepalive also acts as a
 * background auto-recovery loop.
 *
 * Tunable via env:
 *   DB_KEEPALIVE_ENABLED   = 1|0   (default 1)
 *   DB_KEEPALIVE_INTERVAL_MS       (default 120000 = 2 min; keep well under the
 *                                   SQL Anywhere/firewall idle timeout)
 */

const logger = require('../utils/logger');

let timer = null;

function startKeepalive() {
  if (process.env.DB_KEEPALIVE_ENABLED === '0') {
    logger.info('[db] keepalive disabled (DB_KEEPALIVE_ENABLED=0)');
    return;
  }
  const intervalMs = parseInt(process.env.DB_KEEPALIVE_INTERVAL_MS || '120000', 10);
  // Require lazily to avoid a circular dependency (queryHelper -> pool).
  const { executeQuery } = require('./queryHelper');

  timer = setInterval(() => {
    executeQuery('SELECT 1 AS ok', [])
      .then(() => logger.debug('[db] keepalive ok'))
      .catch((err) => logger.warn(`[db] keepalive ping failed (will keep trying): ${err.message}`));
  }, intervalMs);
  // Don't let the keepalive timer hold the event loop open on shutdown.
  if (timer.unref) timer.unref();
  logger.info(`[db] keepalive started (every ${intervalMs} ms)`);
}

function stopKeepalive() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { startKeepalive, stopKeepalive };
