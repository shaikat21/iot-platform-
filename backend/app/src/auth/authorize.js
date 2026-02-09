// Backend/app/src/auth/authorize.js
// -----Do not edit anything in this file.-----

export function authorize(allowedRoles = []) {
  return (req, res, next) => {

    // req.auth must already be set by userID
    if (!req.auth || !Array.isArray(req.auth.roles)) {
      if (allowedRoles.includes("anon")) return next();
      return res.status(403).json({ error: "Forbidden" });
    }

    const userRoles = req.auth.roles;

    // Admin bypass like superuser
    if (userRoles.includes("admin")) return next();

    // Role check
    const hasAccess = allowedRoles.some(role =>
      userRoles.includes(role)
    );

    if (!hasAccess) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
