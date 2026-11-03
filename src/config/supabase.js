import { createClient } from '@supabase/supabase-js';
import { assertSupabaseConfigured, env } from './env.js';

let admin;

export function getSupabaseAdmin() {
  assertSupabaseConfigured();
  admin ??= createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return admin;
}

export function createUserClient(accessToken) {
  assertSupabaseConfigured();
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => accessToken,
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
