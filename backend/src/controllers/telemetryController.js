// src/controllers/telemetryController.js
import { getUserIdFromRequest } from "../middleware/auth.js";
import { getDeviceByIdForUser } from "../models/deviceModel.js";
import { saveTelemetry, getTelemetryForDevice } from "../models/telemetryModel.js";
import { publishMessage } from "../services/mqttClient.js";

//
// POST /api/telemetry/:deviceId
//
export const pushTelemetry = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = getUserIdFromRequest(req);
    const payload = req.body || {};

    await saveTelemetry(deviceId, payload, userId);

    return res.json({ success: true });
  } catch (err) {
    console.error("[pushTelemetry] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

//
// GET /api/telemetry/:deviceId?limit=100
//
export const getDeviceTelemetryHttp = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { deviceId } = req.params;
    const limit = Number(req.query.limit || 100);

    // Check device ownership
    const device = await getDeviceByIdForUser(userId, deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const rows = await getTelemetryForDevice(device.device_id, limit, userId);

    return res.json({ telemetry: rows });
  } catch (err) {
    console.error("[getDeviceTelemetryHttp] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
