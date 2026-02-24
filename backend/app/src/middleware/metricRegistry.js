// src/middleware/metricRegistry.js

// src/middleware/metricRegistry.js

import { db } from "../config/db.js";

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;

  const s = String(v).trim().toLowerCase();
  if (["true", "1", "on", "yes"].includes(s)) return true;
  if (["false", "0", "off", "no"].includes(s)) return false;

  return null; // unknown/invalid boolean
};

let REGISTRY = {};

// ✅ Optional fallback metrics (works even if DB table empty)
const METRIC_DEFINITIONS = {
  vibration: { type: "boolean", category: "binary", unit: null, normalize: toBool },
  online: { type: "boolean", category: "status", unit: null, normalize: toBool },
  rssi: { type: "number", category: "wifi", unit: "dBm", normalize: (v) => Number(v) },
};

const normalizers = {
  number: (v) => Number(v),
  boolean: toBool,
};

export async function initMetricRegistry() {
  const { rows } = await db.query(`
    SELECT metric_key, value_type, category, unit
    FROM metric_definitions
    WHERE active = TRUE
  `);

  REGISTRY = {};
  for (const r of rows) {
    REGISTRY[r.metric_key] = {
      type: r.value_type,
      category: r.category,
      unit: r.unit,
      normalize: normalizers[r.value_type] ?? ((x) => x),
    };
  }

  console.log(`[MetricRegistry] loaded ${rows.length} metrics`);
}

export function getMetricDefinition(metric) {
  if (!metric) return null;
  return REGISTRY[metric] ?? METRIC_DEFINITIONS[metric] ?? null;
}

export function listMetricDefinitions() {
  return Object.entries(REGISTRY).map(([k, v]) => ({
    metric_key: k,
    value_type: v.type,
    category: v.category,
    unit: v.unit,
  }));
}
