import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, _next) {
  const status = Number(err.status || err.statusCode) || 500;
  const context = { requestId: req.id, method: req.method, path: req.originalUrl?.split('?')[0], status, code: err.code, name: err.name, message: err.message };
  if (status >= 500) logger.error({ ...context, err }, 'Unhandled request error');
  else logger.warn(context, 'Request rejected');

  if (res.headersSent) return;
  const publicMessage = String(err.publicMessage || err.message || 'Request could not be completed.')
    .replace(/(sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{20,})/g, '[REDACTED_API_KEY]')
    .slice(0, 500);
  res.status(status).json({
    success: false,
    message: publicMessage,
    errors: err.details ?? (err.provider ? { provider: err.provider, state: err.providerState, code: err.code || null } : null),
    code: err.code || null,
    ...(req.id ? { requestId: req.id } : {}),
  });
}
