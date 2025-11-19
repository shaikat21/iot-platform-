// src/config/db.js
import pkg from "pg";
import { config } from "./env.js";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: config.db.url
});

export const query = (text, params) => pool.query(text, params);
