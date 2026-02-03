import { config } from "../config/env.js";

export function requireEmqx(req, res, next) {
  const expected = config.emwqx.authSecret;
  if (!expected) return next(); // allow in dev if not set

  const got = req.header("x-emqx-secret");
  if (got !== expected) {
    return res.status(401).json({ error: "unauthorized, Broker secret mismatch" });
  }
  next();
}
