// ----- DO NOT TOUCH Reqanontoken -----
// This enforces that *some* valid token exists

export function requireAnonToken(req, res, next) {

  // Allow anon token cookie endpoint ONLY
  if (req.path === "/api/anon-cookie") {
    return next();
  }

  // Allow anon token mint endpoint ONLY
  if (req.path === "/api/anontoken") {
    return next();
  }

  // Allow webhook endpoints (emqx services)
  if (req.path.startsWith("/api/emqx/webhook")) {
    return next();
  }

   // Allow webhook endpoints (emqx services)
  if (req.path.startsWith("/api/emqx/auth")) {
    return next();
  }

  // Allow health endpoints (health services)
  if (req.path.startsWith("/api/health")) {
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
