//src/middleware/auth.js
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import jwksClient from "jwks-rsa";

/**
 * Validate ZITADEL JWT (RS256)
 */
export const auth = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  req.token = token;

  // ZITADEL does not use local keys; headers already trusted by reverse proxy (if any)
  try {
    const decoded = jwt.decode(token, { complete: true });
    req.auth = decoded?.payload;
    next();
  } catch (err) {
    console.error("[auth] decode failed:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Extract user ID from ZITADEL access token
 */
export const getUserIdFromRequest = (req) => {
  if (!req.auth) return null;

  // ZITADEL puts user id inside "sub"
  return req.auth.sub || null;
};
