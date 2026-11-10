import 'dotenv/config';
import { z } from 'zod';

const optionalValue = (schema = z.string()) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  schema.optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().default(process.env.CLIENT_ORIGIN || 'http://localhost:3000'),
  SUPABASE_URL: optionalValue(z.string().url()),
  SUPABASE_PUBLISHABLE_KEY: optionalValue(),
  SUPABASE_SECRET_KEY: optionalValue(),
  SUPABASE_BUCKET: z.string().default('Community'),
  BREVO_API_KEY: optionalValue().default(process.env.BREVO_API),
  BREVO_SENDER_EMAIL: optionalValue(z.string().email()).default(process.env.BREVO_EMAIL),
  BREVO_SENDER_NAME: z.string().default('Kyu-Konnekt'),
  EMAIL_FROM_NAME: z.string().default('Kyu-Konnekt'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SENTRY_DSN: optionalValue(),
  GEMINI_API_KEY: optionalValue().default(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_KEY),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  AI_PROVIDER: z.enum(['auto', 'gemini', 'openai']).default('auto'),
  OPENAI_API_KEY: optionalValue(),
  OPENAI_MODEL_SUMMARY: z.string().default('gpt-4o-mini'),
  OPENAI_MODEL_REASONING: z.string().default('gpt-4o'),
  ENCRYPTION_SECRET: z.string().default('kyu_konnekt_ai_super_secret_32char_key!'),
  ADMIN_FRONTEND_URL: z.string().default('http://localhost:5173'),
  ADMIN_REGISTRATION_KEY: optionalValue(),
  ADMIN_REGISTRATION_SECRET: optionalValue(),
  GOOGLE_CLIENT_ID: optionalValue(),
  GOOGLE_CLIENT_SECRET: optionalValue(),
  MS_CLIENT_ID: optionalValue(),
  MS_CLIENT_SECRET: optionalValue(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;

export function assertSupabaseConfigured() {
  const missing = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']
    .filter((key) => !env[key]);
  if (missing.length) throw new Error(`Supabase configuration is missing: ${missing.join(', ')}`);
}
