// src/models/manufacturedDeviceModel.js
import { db } from "../config/db.js";

function makeErr(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

/**
 * Claim:
 * NEW -> ASSIGNED
 */
export async function claimBySerial({ serial_number, owner_id, assigned_username }) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const r = await client.query(
      `
      SELECT serial_number, status
      FROM manufactured_devices
      WHERE serial_number = $1
      FOR UPDATE
      `,
      [serial_number]
    );

    if (r.rowCount === 0) throw makeErr("NOT_FOUND", "serial not found");

    const row = r.rows[0];
    if (row.status !== "NEW") {
      throw makeErr("NOT_ALLOWED", `serial not claimable (status=${row.status})`);
    }

    const upd = await client.query(
      `
      UPDATE manufactured_devices
      SET
        status = 'ASSIGNED',
        assigned_owner_id = $2,
        assigned_username = $3
      WHERE serial_number = $1
      RETURNING serial_number, status, assigned_owner_id, assigned_username
      `,
      [serial_number, owner_id, assigned_username]
    );

    await client.query("COMMIT");
    return upd.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Provision:
 * ASSIGNED + secret match -> REGISTERED + provisioned_at
 * Returns owner + username + mqtt creds
 */
export async function provisionBySerialAndSecret({
  serial_number,
  prov_secret,
  mqtt_username,
  mqtt_password,
}) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const r = await client.query(
      `
      SELECT
        serial_number,
        status,
        prov_secret,
        assigned_owner_id,
        assigned_username
      FROM manufactured_devices
      WHERE serial_number = $1
      FOR UPDATE
      `,
      [serial_number]
    );

    if (r.rowCount === 0) throw makeErr("NOT_FOUND", "serial not found");

    const d = r.rows[0];

    if (d.status !== "ASSIGNED" || !d.assigned_owner_id || !d.assigned_username) {
      throw makeErr("NOT_READY", "not ready to provision");
    }

    if (String(d.prov_secret || "") !== String(prov_secret)) {
      throw makeErr("BAD_SECRET", "invalid secret");
    }

    await client.query(
      `
      UPDATE manufactured_devices
      SET
        status = 'REGISTERED',
        provisioned_at = NOW()
      WHERE serial_number = $1
      `,
      [serial_number]
    );

    await client.query("COMMIT");

    return {
      owner_id: d.assigned_owner_id,
      username: d.assigned_username,
      mqtt_username,
      mqtt_password,
      base_topic: `tele/${d.assigned_owner_id}/${d.assigned_username}`,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}