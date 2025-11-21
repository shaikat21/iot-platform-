import { db } from "../config/db.js";

export const assignDeviceToUser = async (userId, deviceId) => {
  const q = `
    UPDATE devices
    SET owner_id = $1
    WHERE device_id = $2
    RETURNING *`;

  const result = await db.query(q, [userId, deviceId]);
  return result.rows[0];
};

export const getUserDevices = async (userId) => {
  const q = `
    SELECT device_id, name, serial_number, metadata, online, last_seen
    FROM devices
    WHERE owner_id = $1
    ORDER BY created_at DESC`;

  const result = await db.query(q, [userId]);
  return result.rows;
};

export const userOwnsDevice = async (userId, deviceId) => {
  const q = `
    SELECT 1
    FROM devices
    WHERE owner_id = $1 AND device_id = $2
    LIMIT 1
  `;
  const res = await db.query(q, [userId, deviceId]);
  return res.rowCount > 0;
};

