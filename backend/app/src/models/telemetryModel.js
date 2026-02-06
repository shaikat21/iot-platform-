import { db } from "../config/db.js";


// ---------- INSERT TELEMETRY ----------
export const insertTelemetry = async ({
  deviceId,
  metric,
  category = null,
  unit = null,
  qos = null,
  topic = null,
  valueNum = null,
  valueBool = null,
}) => {
  const q = `
    INSERT INTO telemetry (
      device_id,
      metric,
      category,
      unit,
      qos,
      topic,
      value_num,
      value_bool
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;

  const result = await db.query(q, [
    deviceId,
    metric,
    category,
    unit,
    qos,
    topic,
    valueNum,
    valueBool,
  ]);

  return result.rows[0];
};

// ---------- GET TELEMETRY ----------
export const getTelemetry = async (deviceId, limit = 100) => {
  const q = `
    SELECT
      jsonb_strip_nulls(
        jsonb_build_object(
          'device_id', device_id,
          'category', category,
          'unit', unit,
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
    FROM telemetry
    WHERE device_id = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `;

  const result = await db.query(q, [deviceId, limit]);

  // rows look like: [{ telemetry: {...} }]
  return result.rows.map(r => r.telemetry);
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
