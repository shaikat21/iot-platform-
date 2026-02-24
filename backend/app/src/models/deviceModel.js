// backend/app/src/models/deviceModel.js

import { db } from "../config/db.js";

/**
 * Create a new device.
 */
export const createDevice = async (data) => {
  const q = `
    INSERT INTO devices (device_id, owner_id, name, serial_number, device_type, device_token, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`;

  const params = [
    data.deviceId,
    data.ownerId,
    data.name,
    data.serialNumber,
    data.deviceType,
    data.deviceToken,
    data.metadata || {}
  ];

  const result = await db.query(q, params);
  return result.rows[0];
};

/**
 * Get a device by its ID.
 */
export const getDeviceById = async (deviceId) => {
  const q = `SELECT * FROM devices WHERE device_id = $1 LIMIT 1`;
  const result = await db.query(q, [deviceId]);
  return result.rows[0];
};

export const getDevicesForUser = async (userId) => {
  const q = `
    SELECT device_id, name, serial_number, metadata, online, last_seen
    FROM devices
    WHERE owner_id = $1
    ORDER BY created_at DESC`;
  const res = await db.query(q, [userId]);
  return res.rows;
};

export const getDeviceBySerial = async (serial) => {
  const q = `SELECT * FROM devices WHERE serial_number = $1 LIMIT 1`;
  const res = await db.query(q, [serial]);
  return res.rows[0] || null;
};


export const getDeviceByIdForUser = async (userId, deviceId) => {
  const q = `
    SELECT *
    FROM devices
    WHERE owner_id = $1 AND device_id = $2
    LIMIT 1`;
  const res = await db.query(q, [userId, deviceId]);
  return res.rows[0];
};

export const linkDeviceToUser = async ({ userId, deviceDbId, deviceId }) => {
  // whichever key you prefer – here I’ll use device_id
  const q = `
    UPDATE devices
    SET owner_id = $1
    WHERE device_id = $2
    RETURNING *`;
  const res = await db.query(q, [userId, deviceId]);
  return res.rows[0];
};

/**
 * Mark device online/offline & update last_seen timestamp.
 */
export const setDeviceOnline = async (deviceId, online = true) => {
  const q = `
    UPDATE devices
    SET online = $1, last_seen = NOW()
    WHERE device_id = $2
    RETURNING *`;

  const result = await db.query(q, [online, deviceId]);
  return result.rows[0];
};
// Get owner ID by device ID
export const getOwnerIdByDeviceId = async (deviceId) => {
  const q = `SELECT owner_id FROM devices WHERE device_id = $1 LIMIT 1`;
  const res = await db.query(q, [deviceId]);
  return res.rows[0]?.owner_id || null;
};

export const deleteDeviceForUser = async (userId, deviceId) => {
  // delete device only if owned by this user
  const del = await db.query(
    `DELETE FROM devices
     WHERE owner_id = $1 AND device_id = $2
     RETURNING device_id`,
    [userId, deviceId]
  );

  if (del.rowCount === 0) return null;

  // cleanup child rows AFTER device deletion (safe)
  await db.query(`DELETE FROM telemetry WHERE device_id = $1`, [deviceId]);
  await db.query(`DELETE FROM device_events WHERE device_id = $1`, [deviceId]);

  return del.rows[0];
};

