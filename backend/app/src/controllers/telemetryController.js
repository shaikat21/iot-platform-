// backend/app/src/controllers/telemetryController.js

import { getUserIdFromRequest } from "../auth/userRoleID.js";
import { getDeviceByIdForUser } from "../models/deviceModel.js";
import { insertTelemetry, getTelemetry } from "../models/telemetryModel.js";
import { publishMessage } from "../services/mqttClient.js";


// POST /api/telemetry/:deviceId
export const pushTelemetry = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const ownerId = req.ownerId || getUserIdFromRequest(req);
    const payload = req.body || {};

    const device = await getDeviceByIdForUser(ownerId, deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found or not owned by user" });
    }

    await insertTelemetry(deviceId, payload);

    publishMessage(`devices/${deviceId}/telemetry`, payload);

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("[pushTelemetry] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/telemetry/:deviceId?limit=50&resolution=raw|snapshot
// GET /api/telemetry/:deviceId?limit=50&resolution=snapshot
export const getDeviceTelemetry = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = getUserIdFromRequest(req);

    const limit = Number(req.query.limit ?? 100);

    // ✅ normalize + validate resolution
    
    const resolutionRaw = req.query.resolution;
    const resolution =
      resolutionRaw === "snapshot" ? "snapshot" :
      resolutionRaw === "series" ? "series" :
      "raw";


    console.log("[getDeviceTelemetry] query.resolution =", resolutionRaw, "=>", resolution);
    console.log("[getDeviceTelemetry] limit =", limit);

    const device = await getDeviceByIdForUser(userId, deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found or not owned by user" });
    }

    const telemetry = await getTelemetry(deviceId, limit, resolution);

    res.set("Cache-Control", "no-store");
    return res.json({ telemetry });
  } catch (err) {
    console.error("[getDeviceTelemetryHttp] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};



