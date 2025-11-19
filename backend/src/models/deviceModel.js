// src/models/deviceModel.js
import { query } from "../config/db.js";

/*
Suggested table:
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) UNIQUE NOT NULL,   -- stable ID (e.g. ESP32 MAC)
  name TEXT,
  serial_number TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_devices (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, device_id)
);
*/

export async function initTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(64) UNIQUE NOT NULL,
      name TEXT,
      serial_number TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log("📦 devices table dosent exist, created");
}

export const createDevice = async ({ deviceId, name, serialNumber, metadata = {} }) => {
  const result = await query(
    `
    INSERT INTO devices (device_id, name, serial_number, metadata)
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (device_id) DO UPDATE
      SET name = EXCLUDED.name,
          serial_number = EXCLUDED.serial_number,
          metadata = EXCLUDED.metadata
    RETURNING *;
    `,
    [deviceId, name, serialNumber, JSON.stringify(metadata)]
  );
  return result.rows[0];
};

export const linkDeviceToUser = async ({ userId, deviceDbId, role = "owner" }) => {
  const result = await query(
    `
    INSERT INTO user_devices (user_id, device_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, device_id) DO UPDATE
      SET role = EXCLUDED.role
    RETURNING *;
    `,
    [userId, deviceDbId, role]
  );
  return result.rows[0];
};

export const getDevicesForUser = async userId => {
  const result = await query(
    `
    SELECT d.*
    FROM devices d
    JOIN user_devices ud ON ud.device_id = d.id
    WHERE ud.user_id = $1
    ORDER BY d.created_at DESC;
    `,
    [userId]
  );
  return result.rows;
};

export const getDeviceByIdForUser = async (userId, deviceId) => {
  const result = await query(
    `
    SELECT d.*
    FROM devices d
    JOIN user_devices ud ON ud.device_id = d.id
    WHERE ud.user_id = $1
      AND d.device_id = $2
    LIMIT 1;
    `,
    [userId, deviceId]
  );
  return result.rows[0] || null;
};
