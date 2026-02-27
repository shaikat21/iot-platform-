import { db } from "../config/db.js";

export const getManufacturedBySerial = async (serialNumber) => {
  const q = `
    SELECT serial_number, status, assigned_owner_id, assigned_device_id
    FROM manufactured_devices
    WHERE serial_number = $1
    LIMIT 1
  `;
  const r = await db.query(q, [serialNumber]);
  return r.rows[0] || null;
};

export const claimManufacturedSerialForOwner = async ({ serialNumber, ownerId, deviceId }) => {
  const q = `
    UPDATE manufactured_devices
    SET assigned_owner_id = $1,
        assigned_device_id = $2,
        status = 'ASSIGNED'
    WHERE serial_number = $3
      AND status = 'NEW'
    RETURNING serial_number, status, assigned_owner_id, assigned_device_id
  `;
  const r = await db.query(q, [ownerId, deviceId, serialNumber]);
  return r.rows[0] || null;
};

//ESP request for mqtt cred 

export const provisionAndGetDevice = async ({ serialNumber, provSecret }) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // 1) Move ASSIGNED -> REGISTERED only if secret matches
    const upd = await client.query(
      `
      UPDATE manufactured_devices
      SET status = 'REGISTERED',
          provisioned_at = NOW()
      WHERE serial_number = $1
        AND status = 'ASSIGNED'
        AND prov_secret = $2
      RETURNING assigned_owner_id, assigned_device_id, serial_number, status
      `,
      [serialNumber, provSecret]
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // 2) Pull from devices table (source of truth)
    const dev = await client.query(
      `
      SELECT device_id, owner_id, device_token, serial_number
      FROM devices
      WHERE serial_number = $1
      LIMIT 1
      `,
      [serialNumber]
    );

    await client.query("COMMIT");

    return {
      manufacturing: upd.rows[0],
      device: dev.rows[0] || null,
    };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
};

/**
 * Release a manufactured assignment when a user deletes a device.
 * Only releases if:
 * - status = 'ASSIGNED'
 * - assigned_owner_id matches
 * - assigned_device_id matches
 */
export const releaseManufacturedAssignment = async ({ ownerId, deviceId }) => {
  const q = `
    UPDATE manufactured_devices
    SET status = 'NEW',
        assigned_owner_id = NULL,
        assigned_device_id = NULL,
        provisioned_at = NULL
    WHERE assigned_owner_id = $1
      AND assigned_device_id = $2
      AND status IN ('ASSIGNED', 'REGISTERED')
    RETURNING serial_number, status
  `;
  const r = await db.query(q, [ownerId, deviceId]);
  return r.rows[0] || null;
};