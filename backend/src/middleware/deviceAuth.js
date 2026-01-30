//src/middleware/deviceAuth.js
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const deviceAuth = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, config.deviceJwtSecret);

    req.deviceId = decoded.sub;
    req.ownerId = decoded.owner;
    req.deviceAuth = decoded;

    next();
  } catch (err) {
    console.error("[DeviceAuth] Token failed:", err.message);
    return res.status(401).json({ error: "Invalid or missing token" });
  }
};
