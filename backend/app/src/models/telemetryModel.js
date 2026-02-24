import { db } from "../config/db.js";


// ---------- INSERT TELEMETRY ----------
export const insertTelemetry = async ({
  deviceId,
  position,
  metric,
  category = null,
  unit = null,
  qos = null,
  topic = null,
  valueNum = null,
  valueBool = null,
}) => {
  // ✅ Normalize identity fields
  const normalizedPosition =
    typeof position === "string" ? position.trim().toLowerCase() : null;

  const normalizedMetric =
    typeof metric === "string" ? metric.trim().toLowerCase() : null;

  const normalizedCategory =
    typeof category === "string" ? category.trim().toLowerCase() : null;

  const q = `
    INSERT INTO telemetry (
      device_id,
      position,
      metric,
      category,
      unit,
      qos,
      topic,
      value_num,
      value_bool
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const result = await db.query(q, [
    deviceId,
    normalizedPosition,
    normalizedMetric,
    normalizedCategory,
    unit,
    qos,
    topic,
    valueNum,
    valueBool,
  ]);

  return result.rows[0];
};


// ---------- GET TELEMETRY ----------
export const getTelemetry = async (deviceId, limit = 100, resolution = "raw") => {
  console.log("[telemetryModel] resolution =", resolution);

  const baseJson = `
    jsonb_strip_nulls(
      jsonb_build_object(
        'device_id', device_id,
        'position', position,
        'metric', metric,         
        'category', category,
        'unit', unit,
        'topic', topic,
        'timestamp', timestamp
      )
      ||
      CASE
        WHEN category = 'binary'
          THEN jsonb_build_object('value_bool', value_bool)
        ELSE
          jsonb_build_object('value_num', value_num)
      END
    ) AS telemetry
  `;

  let q = "";
  let params = [];

  if (resolution === "snapshot") {
    // ✅ latest row per (position, metric)
    q = `
      SELECT DISTINCT ON (position, metric)
        ${baseJson}
      FROM telemetry
      WHERE device_id = $1
      ORDER BY position, metric, timestamp DESC
    `;
    params = [deviceId];
  } else {
    // existing: latest N rows
    q = `
      SELECT
        ${baseJson}
      FROM telemetry
      WHERE device_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    params = [deviceId, limit];
  }

  const result = await db.query(q, params);
  return result.rows.map((r) => r.telemetry);
};



//export const getTelemetry = async (deviceId, limit = 100) => {
//  const q = `
//    SELECT
//      id,
//      device_id,
//      metric,
//      category,
//      unit,
//      qos,
//      topic,
//      value_num,
//      value_bool,
//      timestamp
//    FROM telemetry
//    WHERE device_id = $1
//    ORDER BY timestamp DESC
//    LIMIT $2
//  `;
//
//  const result = await db.query(q, [deviceId, limit]);
//  return result.rows;
//};
