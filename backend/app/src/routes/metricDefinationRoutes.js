// backend/app/src/routes/metricDefinationRoutes.js

import { Router } from "express";
import { authorize } from "../auth/authorize.js";
import { requireAuth } from "../auth/requireAuth.js";
import { getMetricCatalog, getOneMetric } from "../controllers/metricController.js";

const router = Router();

// All device routes require authentication
router.use(requireAuth);
router.use(authorize(["admin", "user", "developer"]));
router.get("/", getMetricCatalog);
router.get("/:key", getOneMetric);

//router.use(authorize(["admin"]));
//router.post("/metric", initMetricRegistry);
//router.delete("/metric", initMetricRegistry);
//
export default router;