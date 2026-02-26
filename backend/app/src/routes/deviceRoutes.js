// src/routes/deviceRoutes.js
import { Router } from "express";
import { requireAuth } from "../auth/requireAuth.js";
import { authorize } from "../auth/authorize.js";

import {
  registerDevice,
  listMyDevices,
  getMyDeviceById,
  deleteMyDevice,
  //issueDeviceToken
} from "../controllers/deviceController.js";

import { provisionManufacturedDevice } from "../controllers/deviceProvisionController.js";


const router = Router();

router.post("/provision", provisionManufacturedDevice);

// All device routes require authentication
router.use(requireAuth);
router.use(authorize(["admin", "user", "developer"]));

/**
 * ✅ AUTH (Dashboard)
 * POST /devices/claim
 * body: { serial_number }
 */

// Register new device and assign owner
router.post("/", registerDevice);

// List user's devices
router.get("/", listMyDevices);

// Get one device owned by user
router.get("/:deviceId", getMyDeviceById);
router.delete("/:deviceId", deleteMyDevice);

// Issue device token for device owned by user
//router.post("/:deviceId/token", issueDeviceToken);

export default router;
