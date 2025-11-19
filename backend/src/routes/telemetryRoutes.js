// src/routes/telemetryRoutes.js
import { Router } from "express";
import { zitadelAuth } from "../auth/zitadelAuth.js";
import {
  pushTelemetry,
  getDeviceTelemetryHttp
} from "../controllers/telemetryController.js";

const router = Router();

// All telemetry routes require authentication
router.use(zitadelAuth); 

// POST /api/telemetry/:deviceId
router.post("/:deviceId", pushTelemetry);

// GET /api/telemetry/:deviceId?limit=100
router.get("/:deviceId", getDeviceTelemetryHttp);

export default router;
