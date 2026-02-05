import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env.js";
import {
  createDevice,
  linkDeviceToUser,
  getDevicesForUser,
  getDeviceByIdForUser,
  deleteDeviceForUser,
} from "../models/deviceModel.js";
import { getUserIdFromRequest } from "../auth/userRoleID.js";

// Register new device
export const registerDevice = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { deviceId, name, serialNumber, metadata, deviceType } = req.body;

    if (!deviceId || !serialNumber) {
      return res.status(400).json({ error: "deviceId and serialNumber required" });
    }

    // Auto-generate secure device token
    const deviceToken = crypto.randomBytes(32).toString("hex");

    const device = await createDevice({
      deviceId,
      ownerId: userId,
      name,
      serialNumber,
      deviceType: deviceType || null,
      deviceToken,
      metadata: metadata || {}
    });

    // Make sure device is linked to user
    await linkDeviceToUser({ userId, deviceId });

    return res.status(201).json({ success: true, device });
  } catch (err) {
    console.error("[registerDevice] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// List all devices for user
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

// Get one specific device by ID
export const getMyDeviceById = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { deviceId } = req.params;
    const device = await getDeviceByIdForUser(userId, deviceId);

    if (!device) return res.status(404).json({ error: "Device not found" });

    return res.json({ device });
  } catch (err) {
    console.error("[getMyDeviceById] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMyDevice = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { deviceId } = req.params;
    const deleted = await deleteDeviceForUser(userId, deviceId);

  if (!deleted) return res.status(404).json({ error: "Device not found" });
    
    console.log("[deleteMyDevice] userId=", userId, "deviceId=", deviceId);
    return res.json({ success: true, deleted });

  } catch (err) {
    console.error("[deleteMyDevice] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Issue JWT for device → used by ESP32
//export const issueDeviceToken = async (req, res) => {
//  try {
//    const userId = getUserIdFromRequest(req);
//    if (!userId) return res.status(401).json({ error: "Unauthorized" });
//
//    const { deviceId } = req.params;
//    const device = await getDeviceByIdForUser(userId, deviceId);
//
//    if (!device) return res.status(404).json({ error: "Device not found" });
//
//    const token = jwt.sign(
//      {
//        sub: device.device_id,
//        owner: userId,
//        role: "device"
//      },
//      config.deviceJwtSecret,
//      { expiresIn: "12h" }
//    );
//
//    return res.json({ token, expiresIn: 12 * 3600 });
//  } catch (err) {
//    console.error("[issueDeviceToken] error:", err);
//    return res.status(500).json({ error: "Internal server error" });
//  }
//};
