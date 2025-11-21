// src/routes/emqxRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

const router = express.Router();

/**
 * EMQX AUTH — When a device connects
 * EMQX sends:
 * {
 *   "username": "<deviceId>",
 *   "password": "<deviceToken>"
 * }
 */
router.post("/auth", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ result: "deny" });
  }

  try {
    // Verify device token using your deviceJwtSecret
    const decoded = jwt.verify(password, config.deviceJwtSecret);

    // MUST match device id
    if (decoded.sub !== username) {
      return res.json({ result: "deny" });
    }

    // MUST contain owner (your system requires owner linkage)
    if (!decoded.owner) {
      return res.json({ result: "deny" });
    }

    return res.json({ result: "allow" });
  } catch (err) {
    console.error("[EMQX AUTH] Failed:", err.message);
    return res.json({ result: "deny" });
  }
});

/**
 * No superuser support in your architecture
 */
router.post("/superuser", (req, res) => {
  return res.json({ result: "deny" });
});

/**
 * ACL — Only allow a device to publish/subscribe to:
 * devices/<deviceId>/#
 */
router.post("/acl", (req, res) => {
  const { username, topic } = req.body;

  if (topic && topic.startsWith(`devices/${username}/`)) {
    return res.json({ result: "allow" });
  }

  return res.json({ result: "deny" });
});

export default router;
