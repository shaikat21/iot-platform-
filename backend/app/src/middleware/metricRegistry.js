// src/middleware/metricRegistry.js

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes";
};

export const METRIC_DEFINITIONS = {
  temp: {
    type: "number",
    category: "temperature",
    unit: "°C",
    normalize: (v) => Number(v),
  },

  humidity: {
    type: "number",
    category: "humidity",
    unit: "%",
    normalize: (v) => Number(v),
  },

  water_level: {
    type: "number",
    category: "level",
    unit: "%",
    normalize: (v) => Number(v),
  },

  pressure: {
    type: "number",
    category: "pressure",
    unit: "kPa",
    normalize: (v) => Number(v),
  },

  battery: {
    type: "number",
    category: "power",
    unit: "%",
    normalize: (v) => Number(v),
  },

  flow: {
    type: "number",
    category: "flow",
    unit: "L/min",
    normalize: (v) => Number(v),
  },

  relay: {
    type: "boolean",
    category: "binary",
    unit: null,
    normalize: toBool,
  },

  motion: {
    type: "boolean",
    category: "binary",
    unit: null,
    normalize: toBool,
  },
};


