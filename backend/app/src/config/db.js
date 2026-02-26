// src/config/db.js
import pkg from "pg";
const { Pool } = pkg;
import { config } from "./env.js";

export const pool = new Pool({
  connectionString: config.db.url,
});

// Export db.query for your models
export const db = {
  query: (text, params) => pool.query(text, params),

  //add this for transactional code
  connect: () => pool.connect(),

  // optional: for graceful shutdown hooks; does not affect anything else
  end: () => pool.end(),
};

export default db;
