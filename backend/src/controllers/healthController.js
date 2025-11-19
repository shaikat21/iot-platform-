// src/controllers/healthController.js
import { pool } from "../config/db.js";

export const healthCheck = async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok" });
  } catch (err) {
    console.error("[healthCheck] error:", err);
    return res.status(500).json({ status: "error" });
  }
};
