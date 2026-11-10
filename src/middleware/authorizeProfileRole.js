import { getSupabaseAdmin } from '../config/supabase.js';

export function authorizeProfileRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authentication is required.', errors: null });
    try {
      const { data: profile, error } = await getSupabaseAdmin()
        .from('profiles')
        .select('app_role')
        .eq('id', req.user.id)
        .maybeSingle();
      if (error) return next(error);
      if (!profile || !allowedRoles.includes(profile.app_role)) {
        return res.status(403).json({ success: false, message: 'Administrator access is required.', errors: null });
      }
      req.profileRole = profile.app_role;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
