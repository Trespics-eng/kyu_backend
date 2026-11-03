export function authorize(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.app_metadata?.role;
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication is required.', errors: null });
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to perform this action.', errors: null });
    }
    return next();
  };
}
