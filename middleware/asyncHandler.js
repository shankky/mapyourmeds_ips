'use strict';

/**
 * Wraps an async route handler so thrown/rejected errors flow to the central
 * error handler via next(err) — avoids repetitive try/catch in every route.
 */
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
