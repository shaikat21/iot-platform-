import { Router } from "express";
import { zitadelAuth } from "../auth/zitadelAuth.js";
import { createDevice } from "../models/deviceModel.js"

const router = Router();

// Create device
router.post("/", zitadelAuth, async (req, res) => {
  const { deviceId, name, serialNumber, metadata } = req.body;

  if (!deviceId || !name || !serialNumber) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const device = await createDevice({ deviceId, name, serialNumber, metadata });

    return res.json({
      success: true,
      device
    });

  } catch (err) {
    console.error("Failed to create device:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;
