// src/middleware/VerifyAnonTokenKey.js

import crypto from "crypto";
import { config } from "../config/env.js";

export function VerifyAnonTokenKey(req, res, next) {
  const secret = config.backend?.anontokenSecret;

  if (!secret) {
    console.error("backend.anontokenSecret is not configured");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  const key = req.headers["x-iot-fe-key"];
  if (!key) {
    return res.status(401).json({ error: "missing_token_key" });
  }

  const a = Buffer.from(key);
  const b = Buffer.from(secret);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: "invalid_token_key" });
  }

  next();
}
