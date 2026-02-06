// backend/app/src/controllers/telemetryController.js

import { getUserIdFromRequest } from "../auth/userRoleID.js";
import { getDeviceByIdForUser } from "../models/deviceModel.js";
import { insertTelemetry, getTelemetry } from "../models/telemetryModel.js";
import { publishMessage } from "../services/mqttClient.js";
import {
  normalizeResolution,
  normalizeLimit,
} from "../utils/dataAggregator.js";

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

// GET /api/telemetry/:deviceId?limit=50
export const getDeviceTelemetry = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = getUserIdFromRequest(req);
    const limit = Number(req.query.limit) || 50;

    const device = await getDeviceByIdForUser(userId, deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found or not owned by user" });
    }

    const telemetry = await getTelemetry(deviceId, limit);

    return res.json({ telemetry });
  } catch (err) {
    console.error("[getDeviceTelemetryHttp] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
