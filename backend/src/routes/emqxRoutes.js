// src/routes/emqxRoutes.js

import express from "express";
import jwt from "jsonwebtoken";
import { getDeviceById } from "../models/deviceModel.js";   // <-- your DB lookup
import { setDeviceOnline } from "../models/deviceModel.js";

const router = express.Router();

/**
 * EMQX AUTH — Validates device MQTT credentials
 *
 * EMQX sends:
 * {
 *   "username": "<deviceId>",
 *   "password": "<deviceToken>"
 * }
 */
router.post("/auth", async (req, res) => {
  const { username: deviceId, password: deviceToken } = req.body;

  if (!deviceId || !deviceToken) {
    console.log("[EMQX AUTH] Missing username/password");
    return res.json({ result: "deny" });
  }

try {
    // 1️⃣ DEVICE AUTH
    const device = await getDeviceById(deviceId);

    if (device && device.device_token === deviceToken) {
      return res.json({ result: "allow" });
    }

    // 2️⃣ BACKEND JWT AUTH
    try {
      const decoded = jwt.verify(deviceToken, process.env.MQTT_JWT_SECRET);

      if (decoded?.role === "backend" && decoded?.username === deviceId) {
        return res.json({ result: "allow" });
      }
    } catch (err) {
      // ignore invalid backend JWT
    }

    // 3️⃣ FAIL
    console.log("[EMQX AUTH] Invalid token for:", deviceId);
    return res.json({ result: "deny" });

  } catch (err) {
    console.error("[EMQX AUTH] Error:", err);
    return res.json({ result: "deny" });
  }
});


/**
 * SUPERUSER — You do not use superusers. Always deny.
 */
router.post("/superuser", (_req, res) => {
  return res.json({ result: "deny" });
});

/**
 * ACL — Device may only access topics in devices/<deviceId>/#
 */
router.post("/acl", (req, res) => {
  const { username: deviceId, topic } = req.body;

  if (!deviceId || !topic) return res.json({ result: "deny" });

  if (topic.startsWith(`devices/${deviceId}/`)) {
    return res.json({ result: "allow" });
  }

  return res.json({ result: "deny" });
});

router.post("/webhook", async (req, res) => {
  const data = req.body;

  //console.log("EMQX WEBHOOK RECEIVED:", data);

  try {
    // EMQX sends "event": "client.connected" or "client.disconnected"
    const evt = data.event;
    const deviceId = data.username;

    if (evt === "client.connected") {
      console.log("Device connected:", deviceId);
      await setDeviceOnline(deviceId, true);
    }
    else if (evt === "client.disconnected") {
      console.log("Device disconnected:", deviceId);
      await setDeviceOnline(deviceId, false);
    }
    else {
      console.log("Unknown EMQX event:", evt);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("EMQX Webhook error:", err);
    res.status(500).json({ success: false });
  }
});



export default router;
