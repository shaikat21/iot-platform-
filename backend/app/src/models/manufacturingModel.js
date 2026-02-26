// src/models/manufacturingModel.js
import { db } from "../config/db.js";
import { generateDeviceSerial, generateProvisionSecret } from "./deviceSerialModel.js";

export const manufactureBatch = async ({
  factory,
  line,
  lot,
  prefix = "MI",
  count = 100,
  metadata = {},
  notes = null,
}) => {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("count must be a positive integer");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // ✅ UUIDv7 (Timescale)
    const uuidRes = await client.query(`SELECT to_uuidv7(clock_timestamp()) AS id`);
    const batchId = uuidRes.rows[0].id;

    const rows = [];
    const devices = [];

    for (let i = 0; i < count; i++) {
      const serial = await generateDeviceSerial(factory, line, lot, prefix);
      const provSecret = generateProvisionSecret();

      rows.push([serial, factory, line, lot, provSecret, metadata, notes, batchId]);
      devices.push({ serial_number: serial, prov_secret: provSecret });
    }

    const values = [];
    const placeholders = rows
      .map((row, i) => {
        const base = i * 8;
        values.push(...row);
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8})`;
      })
      .join(",");

    await client.query(
      `
      INSERT INTO manufactured_devices
        (serial_number, factory, line, lot, prov_secret, metadata, notes, batch_id)
      VALUES ${placeholders}
      `,
      values
    );

    await client.query("COMMIT");

    return { batch_id: batchId, devices };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

export async function getBatchForCsv(batch_id) {
  const r = await db.query(
    `
    SELECT
      batch_id,
      serial_number,
      prov_secret,
      factory,
      line,
      lot,
      manufactured_at,
      status
    FROM manufactured_devices
    WHERE batch_id = $1
    ORDER BY id ASC
    `,
    [batch_id]
  );

  return r.rows;
}