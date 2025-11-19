import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import {
  createDevice,
  linkDeviceToUser,
  getDevicesForUser,
  getDeviceByIdForUser
} from "../models/deviceModel.js";
import { getUserIdFromRequest } from "../middleware/auth.js";

// Your SERVICE USER ID from ZITADEL
const SERVICE_USER_ID = "346923971058368515";

export const registerDevice = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const isServiceUser = req.auth?.sub === SERVICE_USER_ID;

    // Allow: human user OR service user
    if (!userId && !isServiceUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { deviceId, name, serialNumber, metadata } = req.body;
    if (!deviceId || !serialNumber) {
      return res.status(400).json({ error: "deviceId and serialNumber required" });
    }

    const device = await createDevice({ deviceId, name, serialNumber, metadata });

    // Only link device to a human user (NOT to service account)
    if (userId) {
      await linkDeviceToUser({ userId, deviceDbId: device.id });
    }

    return res.status(201).json({ device });
  } catch (err) {
    console.error("[registerDevice] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listMyDevices = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const devices = await getDevicesForUser(userId);
    return res.json({ devices });
  } catch (err) {
    console.error("[listMyDevices] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyDeviceById = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { deviceId } = req.params;
    const device = await getDeviceByIdForUser(userId, deviceId);
    if (!device) return res.status(404).json({ error: "Not found" });

    return res.json({ device });
  } catch (err) {
    console.error("[getMyDeviceById] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const issueDeviceToken = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { deviceId } = req.params;
    const device = await getDeviceByIdForUser(userId, deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    const token = jwt.sign(
      {
        sub: device.device_id,
        user: userId,
        role: "device"
      },
      config.deviceJwtSecret,
      { expiresIn: "12h" }
    );

    return res.json({ token, expiresIn: 12 * 60 * 60 });
  } catch (err) {
    console.error("[issueDeviceToken] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
