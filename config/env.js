'use strict';

/**
 * Centralized configuration. Loads .env once and exposes typed config values.
 *
 * Mirrors the proven scaffold connection: `DSN=pelmeds_prod;UID=pelham;PWD=pelham`.
 * Everything is overridable via environment variables so the on-prem server can
 * point at its own DSN/credentials without code changes.
 *
 * NOTE: this service runs on the client's on-prem server (the only place the
 * SQL Anywhere DB / ODBC DSN is reachable). Keep secrets in .env, never in code.
 */

require('dotenv').config();

function required(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    // Don't throw at import time for optional-in-dev values; callers decide.
    return undefined;
  }
  return v;
}

// --- Database (Sybase SQL Anywhere via ODBC) -------------------------------
// The IPS datasource carries both main IPS data AND drug data (the .NET
// EntitiesDrug connection also pointed at datasource `ips`). DRUG_DSN defaults
// to the IPS DSN; set it separately only if the client splits the datasource.
const IPS_DSN = required('IPS_DSN', 'pelmeds_prod');
const IPS_UID = required('IPS_UID', 'pelham');
const IPS_PWD = required('IPS_PWD', 'pelham');

const DRUG_DSN = required('DRUG_DSN', IPS_DSN);
const DRUG_UID = required('DRUG_UID', IPS_UID);
const DRUG_PWD = required('DRUG_PWD', IPS_PWD);

/**
 * Build an ODBC connection string. Extra options can be appended via
 * ODBC_EXTRA (e.g. "CharSet=UTF-8") if the server needs them.
 */
function buildConnectionString({ dsn, uid, pwd }) {
  let cs = `DSN=${dsn};UID=${uid};PWD=${pwd};`;
  const extra = process.env.ODBC_EXTRA;
  if (extra) cs += extra.endsWith(';') ? extra : `${extra};`;
  return cs;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    ips: {
      dsn: IPS_DSN,
      connectionString: buildConnectionString({ dsn: IPS_DSN, uid: IPS_UID, pwd: IPS_PWD }),
    },
    drug: {
      dsn: DRUG_DSN,
      // Same datasource as IPS unless DRUG_DSN/UID/PWD overridden.
      connectionString: buildConnectionString({ dsn: DRUG_DSN, uid: DRUG_UID, pwd: DRUG_PWD }),
      sameAsIps: DRUG_DSN === IPS_DSN && DRUG_UID === IPS_UID && DRUG_PWD === IPS_PWD,
    },
    // Pool sizing — tune on the server based on load.
    pool: {
      initialSize: parseInt(process.env.DB_POOL_INITIAL || '2', 10),
      maxSize: parseInt(process.env.DB_POOL_MAX || '10', 10),
      // If the SQL Anywhere license requires the Meditab CONNECTION_AUTHENTICATION
      // option per-connection, set this env to the full `SET TEMPORARY OPTION ...`
      // statement. Left empty by default (the registered DSN normally carries it).
      connectionInitSql: process.env.DB_CONNECTION_INIT_SQL || '',
    },
  },

  // --- Auth (JWT) ----------------------------------------------------------
  // Used only by the core (SuiterxWebAPI-equivalent) routes. The datasync API
  // matches the legacy behavior (no token required).
  jwt: {
    secret: required('JWT_SECRET', 'GciOiJIU'), // CHANGE in prod via .env
    expirationMinutes: parseInt(process.env.TOKEN_EXPIRATION_MIN || '3', 10),
    algorithm: 'HS256',
  },

  // CORS — matches the legacy Web.config (origin *, the custom x-* headers).
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE', 'PATCH'],
    allowedHeaders: ['x-token', 'x-signoff-token', 'accept', 'content-type', 'x-lang'],
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
