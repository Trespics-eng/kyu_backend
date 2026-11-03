import { getSupabaseAdmin, createUserClient } from '../config/supabase.js';

export async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ success: false, message: 'A valid bearer token is required.', errors: null });
  }

  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ success: false, message: 'The access token is invalid or expired.', errors: null });
    }
    req.user = data.user;
    req.supabase = createUserClient(token);
    return next();
  } catch (error) {
    return next(error);
  }
}
