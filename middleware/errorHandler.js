'use strict';

/**
 * Central error + 404 handling for the API.
 *
 * Replaces the .NET pattern of swallowing DB errors and returning empty data.
 * Errors here are logged and returned as JSON with an appropriate status. The
 * JSON shape echoes the legacy login error fields (errorCode/errorDescription)
 * for consistency, plus a generic `error` message.
 *
 * Phase 5 (IPS-057/058) expands this with validation-error shaping.
 */

const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404).json({
    errorCode: '404',
    errorDescription: 'Not Found',
    error: `No route for ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  logger.error(`[http] ${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  res.status(status).json({
    errorCode: String(status),
    errorDescription: err.expose ? err.message : 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
}

module.exports = { notFound, errorHandler };
