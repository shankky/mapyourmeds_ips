'use strict';

/**
 * ODBC connection pools for Sybase SQL Anywhere.
 *
 * Replaces the scaffold's connect-per-call pattern (routes/index.js) with
 * long-lived pools created once at startup. The `odbc` module's pool exposes
 * `.query(sql, params)`, `.connect()`, and `.close()`.
 *
 * Pools are created lazily on first use (and eagerly via initPools() at boot)
 * so that importing this module never blocks or throws if the DB is briefly
 * unreachable — callers get the error when they actually query.
 *
 * One datasource by default: the drug pool reuses the IPS pool unless a
 * separate DRUG_DSN is configured (config.db.drug.sameAsIps === false).
 */

const odbc = require('odbc');
const config = require('../config/env');
const logger = require('../utils/logger');

let ipsPoolPromise = null;
let drugPoolPromise = null;

async function createPool(connectionString, label) {
  logger.info(`[db] creating ODBC pool: ${label}`);
  const pool = await odbc.pool({
    connectionString,
    initialSize: config.db.pool.initialSize,
    maxSize: config.db.pool.maxSize,
  });

  // Optional: run the Meditab licensing statement (or any per-connection init)
  // if the DSN does not already carry it. Controlled by DB_CONNECTION_INIT_SQL.
  const initSql = config.db.pool.connectionInitSql;
  if (initSql) {
    try {
      const conn = await pool.connect();
      await conn.query(initSql);
      await conn.close();
      logger.info(`[db] ran connectionInitSql on ${label}`);
    } catch (err) {
      logger.error(`[db] connectionInitSql failed on ${label}: ${err.message}`);
      throw err;
    }
  }

  logger.info(`[db] ODBC pool ready: ${label}`);
  return pool;
}

/** Returns the IPS pool (primary datasource). Creates it on first call. */
function getPool() {
  if (!ipsPoolPromise) {
    ipsPoolPromise = createPool(config.db.ips.connectionString, `ips(${config.db.ips.dsn})`)
      .catch((err) => {
        ipsPoolPromise = null; // allow retry on next call
        throw err;
      });
  }
  return ipsPoolPromise;
}

/**
 * Returns the drug pool. When the drug datasource is the same as IPS (default),
 * this is the very same pool object — no second set of connections.
 */
function getDrugPool() {
  if (config.db.drug.sameAsIps) {
    return getPool();
  }
  if (!drugPoolPromise) {
    drugPoolPromise = createPool(config.db.drug.connectionString, `drug(${config.db.drug.dsn})`)
      .catch((err) => {
        drugPoolPromise = null;
        throw err;
      });
  }
  return drugPoolPromise;
}

/** Eagerly initialize pools at boot. Logs (does not crash) on failure. */
async function initPools() {
  try {
    await getPool();
    if (!config.db.drug.sameAsIps) await getDrugPool();
  } catch (err) {
    logger.error(`[db] pool init failed (will retry on first query): ${err.message}`);
  }
}

/** Close pools on shutdown. */
async function closePools() {
  const tasks = [];
  if (ipsPoolPromise) {
    tasks.push(ipsPoolPromise.then((p) => p.close()).catch(() => {}));
  }
  if (drugPoolPromise) {
    tasks.push(drugPoolPromise.then((p) => p.close()).catch(() => {}));
  }
  await Promise.all(tasks);
  ipsPoolPromise = null;
  drugPoolPromise = null;
  logger.info('[db] pools closed');
}

module.exports = { getPool, getDrugPool, initPools, closePools };
