import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import deviceRoutes from "./deviceRoutes.js";
import telemetryRoutes from "./telemetryRoutes.js";
import emqxRoutes from "./emqxRoutes.js";
import anonTokenRoutes from "./anonTokenRoutes.js";
import meRoutes from "./meRoutes.js";
import sessionRoutes from "./sessionRoutes.js";
import cookieRoutes from "./cookieRoutes.js";
import anonCookieRoutes from "./anonCookieRoutes.js";
import metricDefinationRoutes from "./metricDefinationRoutes.js";
import manufacturingRoutes from "./manufacturingRoutes.js";


const router = Router();

router.use("/health", healthRoutes);
router.use("/devices", deviceRoutes);
router.use("/telemetry", telemetryRoutes);
router.use("/emqx", emqxRoutes);
router.use("/anontoken", anonTokenRoutes);
router.use("/me", meRoutes);
router.use("/session", sessionRoutes);
router.use("/cookie", cookieRoutes);
router.use("/anon-cookie", anonCookieRoutes);
router.use("/metrics", metricDefinationRoutes);
router.use("/manufacturing", manufacturingRoutes);




export default router;
