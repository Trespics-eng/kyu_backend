import cors from 'cors';
import { env } from './env.js';

// Build the set of allowed origins from comma-separated FRONTEND_URL env var.
// In development we also always allow common localhost ports so engineers
// don't have to keep env files in sync.
const configuredOrigins = env.FRONTEND_URL
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const DEV_LOCALHOST_ORIGINS = [
  'http://localhost:3000', // kyuconnect dev
  'http://localhost:5173', // admin dev (Vite default)
  'http://localhost:4173', // admin preview
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(env.NODE_ENV !== 'production' ? DEV_LOCALHOST_ORIGINS : []),
]);

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow server-to-server calls (no Origin header) and known origins.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  maxAge: 600,
});
