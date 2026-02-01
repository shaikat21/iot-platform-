import { db } from "../config/db.js";

export const insertTelemetry = async (deviceId, payload) => {
  const q = `
    INSERT INTO telemetry (device_id, payload)
    VALUES ($1, $2)
    RETURNING id`;

  const result = await db.query(q, [deviceId, payload]);
  return result.rows[0];
};

export const getTelemetry = async (deviceId, limit = 100) => {
  const q = `
    SELECT *
    FROM telemetry
    WHERE device_id = $1
    ORDER BY timestamp DESC
    LIMIT $2`;

  const result = await db.query(q, [deviceId, limit]);
  return result.rows;
};
