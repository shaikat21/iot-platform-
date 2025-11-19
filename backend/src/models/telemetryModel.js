// src/models/telemetryModel.js
import { pool } from "../config/db.js";

/**
 * Save telemetry row for a device
 * deviceId  = ESP32-123
 * payload   = arbitrary JSON
 * userId    = (may be null if machine token)
 */
export const saveTelemetry = async (deviceId, payload, userId = null) => {
  const sql = `
    INSERT INTO telemetry (device_id, payload, user_id)
    VALUES ($1, $2, $3)
    RETURNING id;
  `;
  const params = [deviceId, payload, userId];
  const result = await pool.query(sql, params);

  return result.rows[0];
};

/**
 * Get recent telemetry rows for a device
 */
export const getTelemetryForDevice = async (deviceId, limit = 100, userId) => {
  const sql = `
    SELECT id, device_id, payload, user_id, created_at
    FROM telemetry
    WHERE device_id = $1
      AND (user_id = $2 OR $2 IS NULL)   -- allow public/machine access
    ORDER BY created_at DESC
    LIMIT $3;
  `;

  const params = [deviceId, userId, limit];
  const result = await pool.query(sql, params);

  return result.rows;
};
