import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const requestId = req.headers['x-request-id'];
    if (typeof requestId === 'string' && /^[\w-]{1,100}$/.test(requestId)) return requestId;
    return res.getHeader('x-request-id')?.toString() || randomUUID();
  },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
