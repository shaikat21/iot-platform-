// src/routes/deviceRoutes.js
import { Router } from "express";
import { zitadelAuth } from "../auth/zitadelAuth.js";

import {
  registerDevice,
  listMyDevices,
  getMyDeviceById,
  issueDeviceToken
} from "../controllers/deviceController.js";

const router = Router();

// All device routes require authentication
router.use(zitadelAuth);

// Register new device and assign owner
router.post("/", registerDevice);

// List user's devices
router.get("/", listMyDevices);

// Get one device owned by user
router.get("/:deviceId", getMyDeviceById);

// Issue device token for device owned by user
router.post("/:deviceId/token", issueDeviceToken);

export default router;
