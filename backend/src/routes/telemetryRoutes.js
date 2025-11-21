// src/routes/telemetryRoutes.js
import { Router } from "express";
import { deviceAuth } from "../middleware/deviceAuth.js";
import { zitadelAuth } from "../auth/zitadelAuth.js";
import {
  pushTelemetry,
  getDeviceTelemetryHttp
} from "../controllers/telemetryController.js";

const router = Router();



// POST /api/telemetry/:deviceId
router.post("/:deviceId", deviceAuth, pushTelemetry);

// GET /api/telemetry/:deviceId?limit=100
router.get("/:deviceId", zitadelAuth, getDeviceTelemetryHttp);

export default router;
