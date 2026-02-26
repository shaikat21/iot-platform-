import { Router } from "express";
import { requireAuth } from "../auth/requireAuth.js";
import { authorize } from "../auth/authorize.js";
import { manufactureBatchController, downloadBatchCsvController} from "../controllers/manufacturingController.js";

const router = Router();

// Manufacturing is privileged
router.use(requireAuth);
router.use(authorize(["admin", "developer"]));

// POST /api/manufacturing/batch
router.post("/batch", manufactureBatchController);

// GET /api/manufacturing/batch/:id/csv
router.get("/batch/:id/csv", downloadBatchCsvController);


export default router;