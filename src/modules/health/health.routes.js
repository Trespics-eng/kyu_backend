import { Router } from 'express';
import { env } from '../../config/env.js';

const router = Router();
router.get('/', (_req, res) => res.status(200).json({
  success: true,
  message: 'Kyu-Konnekt API is healthy.',
  data: { service: 'kyu-konnekt-api', status: 'ok', timestamp: new Date().toISOString(), environment: env.NODE_ENV },
  meta: null,
}));

export default router;
