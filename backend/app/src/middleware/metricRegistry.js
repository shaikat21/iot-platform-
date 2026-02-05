// src/middleware/metricRegistry.js

import { db } from "../config/db.js";

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes";
};

let REGISTRY = {};

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
      normalize: normalizers[r.value_type],
    };
  }

  console.log(`[MetricRegistry] loaded ${rows.length} metrics`);
}

export function getMetricDefinition(metric) {
  return REGISTRY[metric] ?? METRIC_DEFINITIONS?.[metric];
}

export function listMetricDefinitions() {
  return Object.entries(REGISTRY).map(([k, v]) => ({
    metric_key: k,
    value_type: v.type,
    category: v.category,
    unit: v.unit,
  }));
}
