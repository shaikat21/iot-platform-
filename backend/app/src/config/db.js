// src/config/db.js
import pkg from "pg";
const { Pool } = pkg;
import { config } from "../config/env.js";

export const pool = new Pool({
  connectionString: config.db.url,
});

// Export db.query for your models
export const db = {
  query: (text, params) => pool.query(text, params),
};

export default db;
