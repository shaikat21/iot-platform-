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
        WHEN category IN ('binary','switch')
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
  } else if (resolution === "series") {
    // ✅ best: last N numeric points per (position, metric) + latest booleans
    q = `
      WITH num AS (
        SELECT *
        FROM (
          SELECT
            t.*,
            row_number() OVER (
              PARTITION BY t.position, t.metric
              ORDER BY t.timestamp DESC
            ) AS rn
          FROM telemetry t
          WHERE t.device_id = $1
            AND t.value_num IS NOT NULL
        ) x
        WHERE x.rn <= $2
      ),
      bin AS (
        SELECT DISTINCT ON (t.position, t.metric)
          t.*
        FROM telemetry t
        WHERE t.device_id = $1
          AND t.category IN ('binary','switch')
          AND t.value_bool IS NOT NULL
        ORDER BY t.position, t.metric, t.timestamp DESC
      )
      SELECT ${baseJson}
      FROM (
        SELECT * FROM num
        UNION ALL
        SELECT * FROM bin
      ) u
      ORDER BY u.position, u.metric, u.timestamp ASC
    `;
    params = [deviceId, limit]; // limit = points per metric
  } else {
    // existing: latest N rows total (kept for debugging)
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
