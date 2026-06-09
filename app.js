'use strict';

/**
 * Express app for the IPS / SuiteRx API port.
 *
 * Mounts two router groups under /api:
 *   - datasync (MetizDatasyncAPI-equivalent: Facility, PrescriptionData, Cycle,
 *     TaskManagement, etc.) — no token required (legacy behavior).
 *   - core (SuiterxWebAPI-equivalent: Login, Patient, Prescription, Drug) —
 *     JWT-gated except Login (wired in Phase 4).
 *
 * The live consumer (mym/config/ips.class.js) calls e.g.
 *   POST https://<host>:<port>/api/Facility/GetAllFacility
 * so the controller name is the first path segment under /api.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config/env');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const statusRouter = require('./routes/status');
const datasyncRouter = require('./routes/datasync');
const coreRouter = require('./routes/core');

const app = express();

// View engine (kept from scaffold; unused by the API but harmless).
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- Global middleware ------------------------------------------------------
app.use(cors({
  origin: config.cors.origin,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
}));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- Health check (lightweight liveness; no DB) ----------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.env, time: new Date().toISOString() });
});

// --- Status dashboard at / (live DB connectivity + execution check) --------
app.use('/', statusRouter);

// --- API routes -------------------------------------------------------------
// Both groups mount under /api. Controller names differ, so paths don't collide.
app.use('/api', datasyncRouter);
app.use('/api', coreRouter);

// --- 404 + error handling ---------------------------------------------------
app.use(notFound);
app.use(errorHandler);

logger.info(`[app] initialized (env=${config.env})`);

module.exports = app;
