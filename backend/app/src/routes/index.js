import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import deviceRoutes from "./deviceRoutes.js";
import telemetryRoutes from "./telemetryRoutes.js";
import emqxRoutes from "./emqxRoutes.js";
import anonTokenRoutes from "./anonTokenRoutes.js";
import meRoutes from "./meRoutes.js";
import sessionRoutes from "./sessionRoutes.js";



const router = Router();

router.use("/health", healthRoutes);
router.use("/devices", deviceRoutes);
router.use("/telemetry", telemetryRoutes);
router.use("/emqx", emqxRoutes);
router.use("/anontoken", anonTokenRoutes);
router.use("/me", meRoutes);
router.use("/session", sessionRoutes);


export default router;
