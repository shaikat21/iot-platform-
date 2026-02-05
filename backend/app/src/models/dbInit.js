// backend/app/src/models/dbInit.js

import { db } from "../config/db.js";

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


  // ---------- METRIC DEFINITIONS ----------
await db.query(`
  CREATE TABLE IF NOT EXISTS metric_definitions (
    metric_key TEXT PRIMARY KEY,                 -- temp, humidity, relay...
    value_type TEXT NOT NULL,                    -- number | boolean
    category TEXT NOT NULL,                      -- temperature | humidity | binary...
    unit TEXT NULL,                              -- °C | % | L/min | null
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

await db.query(`
  CREATE INDEX IF NOT EXISTS idx_metric_definitions_category
  ON metric_definitions(category);
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

  console.log("[DB] devices, telemetry, device_events, metric_definitions ensured");

// ---------- SEED METRIC DEFINITIONS (IDEMPOTENT) ----------
const defaults = [
  { key: "temp",        type: "number",  category: "temperature", unit: "°C" },
  { key: "humidity",    type: "number",  category: "humidity",    unit: "%"  },
  { key: "water_level", type: "number",  category: "level",       unit: "%"  },
  { key: "pressure",    type: "number",  category: "pressure",    unit: "kPa"},
  { key: "battery",     type: "number",  category: "power",       unit: "%"  },
  { key: "flow",        type: "number",  category: "flow",        unit: "L/min"},
  { key: "relay",       type: "boolean", category: "binary",      unit: null },
  { key: "motion",      type: "boolean", category: "binary",      unit: null },
];

for (const d of defaults) {
  await db.query(
    `
    INSERT INTO metric_definitions (metric_key, value_type, category, unit)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (metric_key) DO NOTHING
    `,
    [d.key, d.type, d.category, d.unit]
  );
}


};