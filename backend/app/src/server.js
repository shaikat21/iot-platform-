// src/index.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config/env.js";
import { initMqtt } from "./services/mqttClient.js";
import routes from "./routes/index.js";
import { initTables } from "./models/deviceModel.js";
import { zitadelAuth } from "./auth/zitadelAuth.js";
import { checkAudience } from "./auth/checkAudience.js";
import { userID } from "./auth/userRoleID.js";
import { requireAnonToken } from "./auth/requireAnonToken.js";
import http from "http";
import { initWs } from "./services/wsServer.js";
import { requireAuth } from "./auth/requireAuth.js";
import { cookieAuthBridge } from "./auth/cookieAuth.js";



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
  app.use(cors({credentials: true}));
  app.options("*", cors());
}

/* =====================================================
   AUTH CHAIN — required for user/admin endpoints
   BUT allows anonymous because zitadelAuth is optional
   ===================================================== */
app.use(cookieAuthBridge);
app.use(zitadelAuth);
app.use(checkAudience);
app.use(userID);

/* =====================================================
   ROUTES (public + user + admin)
   Public routes are handled by authorize(["anon"])
   Protected routes use authorize(["user"])
   Admin routes use authorize(["admin"])
   ===================================================== */

// ENFORCE anon token everywhere except /api/auth/anontoken
// please uncomment app.use(requireAnonToken); once FE configured to use anon_token for unauthenticated public endpoint

app.use(requireAnonToken);

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

// Create HTTP server (required for WebSocket upgrade)
const server = http.createServer(app);

// Attach WebSocket with SAME auth chain (AUTH USERS ONLY)
initWs(server, {
  middlewares: [
    zitadelAuth,
    checkAudience,
    userID,
    requireAuth,
  ],
});

// Start server
server.listen(config.port, () => {
  console.log(`IoT backend listening on port ${config.port}`);
  initMqtt(); 
  initTables();
});
