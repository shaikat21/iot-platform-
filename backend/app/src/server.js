// src/index.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config/env.js";
import { initMqtt } from "./services/mqttClient.js";
import routes from "./routes/index.js";
import { initTables } from "./models/deviceModel.js";

console.log("ACTUAL DATABASE_URL:", config.db.url);


const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

if (config.corsOrigins.length > 0) {
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      // allow server-to-server / curl / healthchecks
      if (!origin) return callback(null, true);

      // allow configured origins
      if (config.corsOrigins.includes(origin)) return callback(null, true);

      // IMPORTANT: deny without throwing (prevents 500)
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-iot-fe-key"],
    maxAge: 86400,
  });

  app.use(corsMiddleware);

  // IMPORTANT: respond to preflight before routes
  app.options("*", corsMiddleware);
} else {
  app.use(cors());
  app.options("*", cors());
}

// API Routes
app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Invalid or missing token" });
  }

  return res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(config.port, () => {
  console.log(`IoT backend listening on port ${config.port}`);
  initMqtt(); 
  initTables();
});
