// src/controllers/deviceProvisionController.js
import { provisionAndGetDevice } from "../models/manufacturingClaimModel.js";


/**
 * POST /devices/provision (PUBLIC)
 * body: { serial_number, prov_secret }
 */
export const provisionManufacturedDevice = async (req, res) => {
  try {
    const serialNumber = String(req.body?.serial_number || "").trim();
    const provSecret = String(req.body?.prov_secret || "").trim();

    if (!serialNumber || !provSecret) {
      return res.status(400).json({ error: "serial_number and prov_secret required" });
    }

    const out = await provisionAndGetDevice({ serialNumber, provSecret });

    if (!out) {
      // either wrong secret OR not in ASSIGNED state
      return res.status(403).json({ error: "Provisioning not allowed" });
    }

    if (!out.device) {
      // manufacturing row updated but device row missing => data integrity issue
      return res.status(500).json({ error: "Device record not found for serial" });
    }

    // Return from devices table (as you requested)
    return res.json({
      success: true,
      owner_id: out.device.owner_id,
      device_id: out.device.device_id,
      device_token: out.device.device_token,
    });
  } catch (err) {
    console.error("[provisionManufacturedDevice] error:", err);
    return res.status(500).json({ error: "Provision failed" });
  }
};