// src/routes/telemetryRoutes.js
// src/routes/telemetryRoutes.js
import { Router } from "express";
import { authorize } from "../auth/authorize.js";
import { requireAuth } from "../auth/requireAuth.js";
import { pushTelemetry, getDeviceTelemetry } from "../controllers/telemetryController.js";

// ✅ use your aggregation helpers
import {
  normalizeResolution,
  normalizeLimit,
} from "../utils/dataAggregator.js";

const router = Router();

router.use(requireAuth);
router.use(authorize(["admin", "user", "developer"]));

/**
 * Parse:
 * - YYYY-MM-DD
 * - YYYY-MM-DDTHH:mm[:ss][.sss][Z or ±HH:MM]
 * - HH:mm[:ss]  (assumes today)
 */
function parseDateOrTimeToISO(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // time-only: HH:mm or HH:mm:ss => assume today
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const today = new Date().toISOString().slice(0, 10);
    return new Date(`${today}T${s}`).toISOString();
  }

  // date-only: YYYY-MM-DD => start of day UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00.000Z`).toISOString();
  }

  // datetime
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

function normalizeTelemetryQuery(req, res, next) {
  try {
    const q = req.query || {};

    const fromISO = parseDateOrTimeToISO(q.from);
    const toISO = parseDateOrTimeToISO(q.to);

    if (fromISO && toISO) {
      const fromMs = Date.parse(fromISO);
      const toMs = Date.parse(toISO);
      if (fromMs > toMs) {
        return res
          .status(400)
          .json({ error: "invalid_range", message: "`from` must be <= `to`" });
      }
    }

    // pass normalized values to controller
    req.query.from = fromISO ?? undefined;
    req.query.to = toISO ?? undefined;

    //use your aggregation util for these
    req.query.limit = String(normalizeLimit(q.limit, 50, 1, 500));
    req.query.resolution = normalizeResolution(q.resolution, "raw");

    next();
  } catch {
    return res.status(400).json({ error: "bad_query" });
  }
}

// POST /api/telemetry/:deviceId
router.post("/:deviceId", pushTelemetry);

// GET /api/telemetry/:deviceId?limit=50&from=...&to=...&resolution=...
router.get("/:deviceId", normalizeTelemetryQuery, getDeviceTelemetry);

export default router;

