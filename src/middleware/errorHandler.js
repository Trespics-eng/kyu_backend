import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, _next) {
  const status = Number(err.status || err.statusCode) || 500;
  if (status >= 500) logger.error({ err, requestId: req.id }, 'Unhandled request error');
  else logger.warn({ code: err.code, status, requestId: req.id }, 'Request rejected');

  if (res.headersSent) return;
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'An unexpected server error occurred.' : err.message,
    errors: err.details ?? null,
    ...(req.id ? { requestId: req.id } : {}),
  });
}
