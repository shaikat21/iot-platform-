import {
  listMetricDefinitions,
  getMetricDefinition as getMetricDefFromRegistry,
} from "../middleware/metricRegistry.js";

export function getMetricCatalog(req, res) {
  const metrics = listMetricDefinitions(); // cached list

  const categories = [...new Set(metrics.map((m) => m.category))].sort();

  return res.json({ categories, metrics });
}

export function getOneMetric(req, res) {
  const key = req.params.key;
  const def = getMetricDefFromRegistry(key);

  if (!def) return res.status(404).json({ error: "Unknown metric" });

  return res.json({
    metric_key: key,
    value_type: def.type,
    category: def.category,
    unit: def.unit,
  });
}
