import { getSupabaseAdmin, createUserClient } from '../config/supabase.js';

export async function optionalAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    req.user = null;
    return next();
  }

  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && data?.user) {
      req.user = data.user;
      req.supabase = createUserClient(token);
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  return next();
}

