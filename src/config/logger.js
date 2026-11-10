import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'password', 'token', 'access_token', 'refresh_token', 'apiKey', 'api_key', 'GEMINI_API_KEY', 'OPENAI_API_KEY'],
    censor: '[REDACTED]',
  },
});
