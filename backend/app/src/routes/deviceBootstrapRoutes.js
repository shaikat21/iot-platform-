
import { getDeviceBySerial } from "../models/deviceModel.js";
import { Router } from "express";
import { VerifyDeviceBootstrapKey } from "../middleware/VerifyDeviceBootstrapKey.js"

const router = Router();

/**
 * Public bootstrap: device uses ONLY serial + token
 * Body:
 * { "serial": "...", "password": "..." }
 *
 * Response:
 * { "ownerId": "...", "username": "WH_Central_Alarm" }
 */
router.post("/", VerifyDeviceBootstrapKey, async (req, res) => {
  try {
    const { serial } = req.body || {};
    if (!serial) return res.status(400).json({ error: "missing_serial" });

    const device = await getDeviceBySerial(serial);
    if (!device) return res.status(404).json({ error: "device_not_found" });

    if (!device.owner_id) return res.status(409).json({ error: "device_not_linked" });

    // If mqtt password not created yet
    if (!device.device_token) return res.status(409).json({ error: "mqtt_not_provisioned" });

    return res.json({
      ownerId: String(device.owner_id),
      username: device.device_id,
      mqttPassword: device.device_token,
    });
  } catch (err) {
    console.error("[BOOTSTRAP] error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});


export default router;
