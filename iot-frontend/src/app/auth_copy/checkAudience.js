// src/auth/checkAudience.js

// ---- Do not edit anything in this file ----//

import { config } from "../config/env.js";

export const checkAudience = (req, res, next) => {
  const projectId = config.zitadel.projectId;
  const serviceClientId = config.zitadel.serviceClientId

  // No token present → guest → allow
  if (!req.auth) return next();
  if (!req.auth.aud) return next(); // Anonymous token? Allow.

  // Token present → validate audience
  const aud = req.auth.aud;

  const valid = Array.isArray(aud)
    ? aud.includes(projectId) || aud.includes(serviceClientId)
    : aud === projectId || aud === serviceClientId;

  if (!valid) {
    return res.status(403).json({
      error: `Invalid token audience`,
      expected: projectId,
      got: aud,
    });
  }

  next();
};
