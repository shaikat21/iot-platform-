// ----- DO NOT TOUCH zitadelAuth -----
// This enforces that *some* valid token exists

export function requireAnonToken(req, res, next) {

  // Allow anon token mint endpoint ONLY
  if (req.path === "/api/auth/anontoken") {
    return next();
  }

  // Allow webhook endpoints (external services)
  if (req.path.startsWith("/api/webhook/github")) {
    return next();
  }

  // Allow health endpoints (external services)
  if (req.path.startsWith("/health")) {
    return next();
  }

  // zitadelAuth already ran
  if (!req.auth) {
    return res.status(401).json({
      error: "token_required"
    });
  }

  next();
}
