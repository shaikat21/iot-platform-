import { db } from "../config/db.js";
import { generateEnterpriseSerial } from "./deviceSerialModel.js";


/**
 * Ultra-fast batch manufacturing
 * Generates many serials and inserts them in a single query
 */
export const manufactureBatch = async ({
  factory,
  line,
  lot,
  prefix = "MI",
  count = 100,
  metadata = {},
  notes = null
}) => {

  if (!Number.isInteger(count) || count <= 0 || count > 20000) {
    throw new Error("count must be between 1 and 20000");
  }

  const rows = [];

  // Generate serials sequentially (atomic counter ensures uniqueness)
  for (let i = 0; i < count; i++) {
    const serial = await generateEnterpriseSerial(factory, line, lot, prefix);
    rows.push([
      serial,
      factory,
      line,
      lot,
      metadata,
      notes
    ]);
  }

  // Build VALUES placeholders dynamically
  const values = [];
  const placeholders = rows.map((row, i) => {
    const baseIndex = i * 6;
    values.push(...row);
    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
  }).join(",");
  
  
  console.log("First serial:", rows[0]?.[0]);
  
  
  const query = `
    INSERT INTO manufactured_devices
      (serial_number, factory, line, lot, metadata, notes)
    VALUES ${placeholders}
    RETURNING serial_number;
  `;

  const result = await db.query(query, values);

  return result.rows.map(r => r.serial_number);
};