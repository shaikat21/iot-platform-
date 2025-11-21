import { db } from "../config/db.js";

export const logDeviceEvent = async (deviceId, type, data = {}) => {
  const q = `
    INSERT INTO device_events (device_id, event_type, data)
    VALUES ($1, $2, $3)
    RETURNING *`;

  const result = await db.query(q, [deviceId, type, data]);
  return result.rows[0];
};

export const getDeviceEvents = async (deviceId, limit = 50) => {
  const q = `
    SELECT *
    FROM device_events
    WHERE device_id = $1
    ORDER BY timestamp DESC
    LIMIT $2`;

  const result = await db.query(q, [deviceId, limit]);
  return result.rows;
};
