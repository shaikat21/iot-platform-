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
    position TEXT NULL,          -- east_kitchen, west_store, etc
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
  CREATE INDEX IF NOT EXISTS idx_telemetry_device_position_time
  ON telemetry (device_id, position, timestamp DESC);
`);

await db.query(`
  CREATE INDEX IF NOT EXISTS idx_telemetry_device_position_metric_time
  ON telemetry (device_id, position, metric, timestamp DESC);
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

//-------------Manufacturing data, Device serial counter -----------

await db.query(`
  CREATE TABLE IF NOT EXISTS device_serial_counters (
    serial_date DATE NOT NULL,
    lot INTEGER NOT NULL CHECK (lot >= 0 AND lot <= 999),
    seq INTEGER NOT NULL DEFAULT 0 CHECK (seq >= 0),
    PRIMARY KEY (serial_date, lot)
  );
`);

await db.query(`
  CREATE INDEX IF NOT EXISTS idx_device_serial_counters_date
  ON device_serial_counters(serial_date);
`);

console.log("[DB] devices, telemetry, device_events, metric_definitions, device_serial_counters ensured");


//----------- device manufacturing data , serial -----------

await db.query(`
  CREATE TABLE IF NOT EXISTS manufactured_devices (
    id BIGSERIAL PRIMARY KEY,

    serial_number TEXT NOT NULL UNIQUE,

    factory CHAR(1) NOT NULL,
    line CHAR(1) NOT NULL,
    lot INTEGER NOT NULL CHECK (lot >= 0 AND lot <= 999),

    manufactured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    status TEXT NOT NULL DEFAULT 'NEW',   -- NEW | ASSIGNED | REGISTERED | RMA | VOID
    assigned_device_id TEXT NULL,         -- your internal device_id when assigned
    assigned_owner_id TEXT NULL,          -- owner/user when assigned

    notes TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
  );
`);

await db.query(`
  CREATE INDEX IF NOT EXISTS idx_manufactured_devices_status
  ON manufactured_devices(status);
`);

await db.query(`
  CREATE INDEX IF NOT EXISTS idx_manufactured_devices_mfg_time
  ON manufactured_devices(manufactured_at DESC);
`);

// --- Add provisioning secret ---
await db.query(`
  ALTER TABLE manufactured_devices
    ADD COLUMN IF NOT EXISTS prov_secret TEXT NULL,
    ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ NULL;
`);


console.log("[DB] devices, telemetry, device_events, metric_definitions, device_serial_counters, manufactured_devices ensured");


// ---------- SEED METRIC DEFINITIONS (IDEMPOTENT) ----------
const defaults = [
  { key: "temp",          type: "number",  category: "temperature", unit: "°C" },
  { key: "humidity",      type: "number",  category: "humidity",    unit: "%"  },
  { key: "water_level",   type: "number",  category: "level",       unit: "%"  },
  { key: "pressure",      type: "number",  category: "pressure",    unit: "kPa"},
  { key: "battery",       type: "number",  category: "power",       unit: "%"  },
  { key: "flow",          type: "number",  category: "flow",        unit: "L/min"},
  { key: "relay",         type: "boolean", category: "switch",      unit: null },
  { key: "motion",        type: "boolean", category: "binary",      unit: null },
  { key: "binary_sensor", type: "boolean", category: "binary",      unit: null },
  { key: "signal",        type: "number",  category: "wifi",        unit: "dBm" },
  { key: "online",        type: "boolean",  category: "binary",        unit: null },
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