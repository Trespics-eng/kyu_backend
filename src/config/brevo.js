import { BrevoClient } from '@getbrevo/brevo';
import { env } from './env.js';

export const brevo = env.BREVO_API_KEY ? new BrevoClient({ apiKey: env.BREVO_API_KEY }) : null;
