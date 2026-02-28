// controllers/emqxAuthController.js
import jwt from "jsonwebtoken";
import { config } from "../config/env.js"; 
import { setDeviceOnline } from "../models/deviceModel.js";
import { getDeviceById, promoteDeviceProvisioningStatus } from "../models/deviceModel.js";


export async function emqxAuthController(req, res) {
  const { username: deviceId, password: deviceToken } = req.body;

  if (!deviceId || !deviceToken) {
    console.log("[EMQX AUTH] Missing username/password");
    return res.json({ result: "deny" });
  }

  // =========================================================
  // 1) BACKEND JWT AUTH (fast path)
  // =========================================================
  try {
    const decoded = jwt.verify(deviceToken, config.emqx.authSecret);

    if (decoded?.role === "backend" && decoded?.username === deviceId) {
      // Optionally attach backend attrs if you use ACL rules for backend
      return res.json({
        result: "allow",
        is_superuser: false,
        client_attrs: {
          role: "backend",
          username: decoded.username,
        },
      });
    }

    // JWT valid but not backend identity → fall through to device auth
    console.warn("[EMQX AUTH] Valid JWT but not backend:", {
      deviceId,
      role: decoded?.role,
    });
  } catch (err) {
    // Not a backend JWT (or invalid/expired) → fall through to device auth
    if (err?.name !== "TokenExpiredError") {
      console.warn("[EMQX AUTH] Invalid backend JWT:", {
        deviceId,
        reason: err?.name,
      });
    }
  }

  // =========================================================
  // 2) DEVICE AUTH (deviceId + deviceToken)
  // =========================================================
try {
    const device = await getDeviceById(deviceId);

    // ✅ Not found => deny (no crash)
    if (!device) {
      console.log("[EMQX AUTH] Unknown device:", deviceId);
      return res.json({ result: "deny" });
    }

    // ✅ check secret
    if (device.device_token !== deviceToken) {
      console.log("[EMQX AUTH] Invalid token for:", deviceId);
      return res.json({ result: "deny" });
    }

    // ✅ auth success: update last_seen (safe with your schema)
    await setDeviceOnline(deviceId, true); // sets online=true + last_seen=NOW()

    // Promote ASSIGNED + never seen => REGISTERED, and always set last_seen (atomic)
    await promoteDeviceProvisioningStatus(deviceId);

    return res.json({
      result: "allow",
      is_superuser: false,
      client_attrs: {
        ownerId: device.owner_id,
        deviceId,
        serial: device.serial_number ?? null,
      },
    });
  } catch (err) {
    console.error("[EMQX AUTH] Device auth error:", err?.message || err);
    return res.json({ result: "deny" });
  }
}