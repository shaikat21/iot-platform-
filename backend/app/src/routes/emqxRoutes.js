// src/routes/emqxRoutes.js

import express from "express";
import jwt from "jsonwebtoken";
import { getDeviceById } from "../models/deviceModel.js";   // <-- your DB lookup
import { setDeviceOnline } from "../models/deviceModel.js";
import { config } from "../config/env.js";
import { requireEmqx } from "../middleware/emqxOnly.js";
import { wsSendToUser } from "../services/wsServer.js";
import { emqxAuthController } from "../controllers/emqxAuthController.js";

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
router.post("/auth", requireEmqx, emqxAuthController);


/**
 * SUPERUSER — You do not use superusers. Always deny.
 */
router.post("/superuser", (_req, res) => {
  return res.json({ result: "deny" });
});


router.post("/webhook", requireEmqx, async (req, res) => {
 // console.log("====== EMQX WEBHOOK RAW ======");
 // console.log(JSON.stringify(req.body, null, 2));
 // console.log("================================");
  const data = req.body;

  try {
    const evt = data.event;
    const deviceId = data.username;

    if (!deviceId) {
      console.warn("[EMQX] webhook missing clientid:", data);
      return res.json({ success: true });
    }

    if (evt === "client.connected") {
      const updated = await setDeviceOnline(deviceId, true);
      console.log("[EMQX] connected:", deviceId, "owner:", updated?.owner_id);

      if (updated?.owner_id) {
        const sent = wsSendToUser(updated.owner_id, {
          type: "device_status",
          deviceId: updated.device_id,
          online: true,
          lastSeen: updated.last_seen,
        });
        console.log("[WS] device_status sent:", sent, "user:", updated.owner_id);
      }
    } else if (evt === "client.disconnected") {
      const updated = await setDeviceOnline(deviceId, false);
      console.log("[EMQX] disconnected:", deviceId, "owner:", updated?.owner_id);

      if (updated?.owner_id) {
        const sent = wsSendToUser(updated.owner_id, {
          type: "device_status",
          deviceId: updated.device_id,
          online: false,
          lastSeen: updated.last_seen,
        });
        console.log("[WS] device_status sent:", sent, "user:", updated.owner_id);
      }
    } else {
      // ignore other webhook events
      // console.log("[EMQX] ignored event:", evt);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("EMQX Webhook error:", err);
    res.status(500).json({ success: false });
  }
});




export default router;
