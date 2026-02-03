import { db } from "../config/db.js";

/**
 * Initializes the devices table if not exists.
 * Called from server.js → initTables()
 */
export const initTables = async () => {
  // ---------- DEVICES ----------
  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT NOT NULL,
      serial_number TEXT UNIQUE NOT NULL,
      device_type TEXT,
      device_token TEXT UNIQUE NOT NULL,
      metadata JSONB DEFAULT '{}',
      online BOOLEAN DEFAULT FALSE,
      last_seen TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_devices_owner_id 
    ON devices(owner_id);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_devices_online 
    ON devices(online);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_devices_last_seen 
    ON devices(last_seen);
  `);


// ---------- TELEMETRY ----------
await db.query(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id SERIAL PRIMARY KEY,

    device_id TEXT NOT NULL,
    metric TEXT NOT NULL,        -- temp, humidity, relay, etc
    category TEXT NULL,          -- temperature, humidity, binary
    unit TEXT NULL,              -- °C, %, cm, etc
    qos SMALLINT NULL,
    topic TEXT NULL,

    value_num DOUBLE PRECISION NULL,
    value_bool BOOLEAN NULL,

    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT telemetry_value_check
      CHECK (value_num IS NOT NULL OR value_bool IS NOT NULL)
  );
`);

await db.query(`
  CREATE INDEX IF NOT EXISTS idx_telemetry_device_time
  ON telemetry (device_id, timestamp DESC);
`);

await db.query(`
  CREATE INDEX IF NOT EXISTS idx_telemetry_device_metric_time
  ON telemetry (device_id, metric, timestamp DESC);
`);


  // ---------- DEVICE EVENTS ----------
  await db.query(`
    CREATE TABLE IF NOT EXISTS device_events (
      id SERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_device_events_device_id 
    ON device_events(device_id);
  `);

  console.log("[DB] devices, telemetry, device_events ensured");
};



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
