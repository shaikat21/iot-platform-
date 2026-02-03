// src/routes/telemetryRoutes.js
import { Router } from "express";
import { authorize } from "../auth/authorize.js";
import { requireAuth } from "../auth/requireAuth.js";
import {
  pushTelemetry,
  getDeviceTelemetryHttp
} from "../controllers/telemetryController.js";

const router = Router();

// All device routes require authentication
router.use(requireAuth);
router.use(authorize(["admin", "user", "developer"]));

// POST /api/telemetry/:deviceId
router.post("/:deviceId", pushTelemetry);

// GET /api/telemetry/:deviceId?limit=100
router.get("/:deviceId", getDeviceTelemetryHttp);

export default router;
