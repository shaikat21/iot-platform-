
//src/middleware/VerifyDeviceBootstrapKey.js

import crypto from "crypto";
import { config } from "../config/env.js";

/**
 * Verifies internal device bootstrap key.
 * Header required:
 *   x-iot-device-key: <shared-secret>
 */
export function VerifyDeviceBootstrapKey(req, res, next) {
  const secret = config.device?.deviceBootstrapSecret;

  if (!secret) {
    console.error("backend.deviceBootstrapSecret is not configured");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  const key = req.headers["x-iot-device-key"];
  if (!key) {
    return res.status(401).json({ error: "missing_device_key" });
  }

  const a = Buffer.from(key);
  const b = Buffer.from(secret);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: "invalid_device_key" });
  }

  next();
}
