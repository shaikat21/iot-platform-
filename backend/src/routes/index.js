import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import deviceRoutes from "./deviceRoutes.js";
import telemetryRoutes from "./telemetryRoutes.js";
import emqxRoutes from "./emqxRoutes.js";



const router = Router();

router.use("/health", healthRoutes);
router.use("/devices", deviceRoutes);
router.use("/telemetry", telemetryRoutes);
router.use("/emqx", emqxRoutes);


export default router;
