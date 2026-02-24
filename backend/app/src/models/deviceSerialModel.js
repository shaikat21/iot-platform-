import { db } from "../config/db.js";
import crypto from "crypto";
import { config } from "../config/env.js";  

const BASE36 = config.device.deviceBootstrapSecret;

function toBase36(n) {
  if (!Number.isFinite(n) || n < 0 || n >= BASE36.length) {
    throw new Error(`toBase36 out of range: ${n}`);
  }
  return BASE36[n];
}

function pad(n, len) {
  const s = String(Math.trunc(n));
  return s.length >= len ? s : "0".repeat(len - s.length) + s;
}

function generateChecksum(input) {
  const hash = crypto.createHash("sha1").update(input).digest("hex");
  return hash.charAt(0).toUpperCase();
}

/**
 * 🔐 Provisioning Secret Generator
 * 32 bytes -> 64 hex chars
 * Strong enough for device authentication
 */
export function generateProvisionSecret() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Enterprise Serial
 * Format: PREFIX-YMDD-FL-LOT-SEQ-C
 * Example: MI-6C16-A1-042-01234-X
 */
export async function generateEnterpriseSerial(
  factory,
  line,
  lot,
  prefix = "MI"
) {
  if (!factory || factory.length !== 1)
    throw new Error("factory must be 1 char (e.g. 'A')");
  if (!line || line.length !== 1)
    throw new Error("line must be 1 char (e.g. '1')");
  if (!Number.isInteger(lot) || lot < 0 || lot > 999)
    throw new Error("lot must be 0..999");

  const today = new Date();

  // Year code: 2020->0, 2026->6 ... supports until 2055->Z
  const yearOffset = today.getFullYear() - 2020;
  const yearCode = toBase36(yearOffset);

  // Month code: 1..12 => 1..9,A,B,C
  const monthCode = toBase36(today.getMonth() + 1);

  const day = pad(today.getDate(), 2);
  const dateKey = today.toISOString().split("T")[0];

  // Atomic increment
  const result = await db.query(
    `
    INSERT INTO device_serial_counters (serial_date, lot, seq)
    VALUES ($1, $2, 1)
    ON CONFLICT (serial_date, lot)
    DO UPDATE SET seq = device_serial_counters.seq + 1
    RETURNING seq
    `,
    [dateKey, lot]
  );

  const seq = result.rows[0].seq;

  if (seq > 99999)
    throw new Error("Daily overflow (max 100000 per lot)");

  const core =
    `${prefix}-${yearCode}${monthCode}${day}-` +
    `${factory}${line}-` +
    `${pad(lot, 3)}-` +
    `${pad(seq, 5)}`;

const checksum = generateChecksum(core);
  return `${core}-${checksum}`;
}
