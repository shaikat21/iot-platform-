// src/index.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config/env.js";
import { initMqtt } from "./services/mqttClient.js";
import routes from "./routes/index.js";
import { initTables } from "./models/deviceModel.js";

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

if (config.corsOrigins.length > 0) {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );
} else {
  app.use(cors());
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
  console.log(`🚀 IoT backend listening on port ${config.port}`);
  initMqtt(); 
  initTables();
});
