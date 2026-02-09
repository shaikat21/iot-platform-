// src/services/wsServer.js
import { WebSocketServer } from "ws";
import { publishMessage } from "./mqttClient.js";
import { config } from "../config/env.js";
import { getDeviceByIdForUser } from "../models/deviceModel.js";

/**
 * userId -> Set<WebSocket>
 * Keep this module-scoped so any route can push updates.
 */
const userSockets = new Map();

function addSocket(userId, ws) {
  if (!userId) return;
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(ws);
}

function removeSocket(userId, ws) {
  if (!userId) return;
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) userSockets.delete(userId);
}

/**
 * Send a message to all active sockets for a user.
 * Safe: ignores missing/offline sockets.
 */
  export function wsSendToUser(userId, payload) {
  if (!userId) return 0;

  userId = String(userId); // normalize key

  const set = userSockets.get(userId);
  if (!set || set.size === 0) {
    console.warn(
      "[WS] wsSendToUser: no sockets for userId:",
      userId,
      "knownUsers:",
      [...userSockets.keys()]
    );
    return 0;
  }

  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  let sent = 0;

  for (const ws of set) {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
        sent++;
      }
    } catch {
      // ignore individual socket send failures
    }
  }

  return sent;
}


/** Optional helper if you ever want broadcast */
export function wsBroadcast(payload) {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  let sent = 0;
  for (const [, set] of userSockets) {
    for (const ws of set) {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
          sent++;
        }
      } catch {}
    }
  }
  return sent;
}

function getCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;

  const parts = raw.split(";").map((s) => s.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;

    const k = p.slice(0, idx);
    const v = p.slice(idx + 1);
    if (k !== name) continue;

    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

function runMiddlewares(middlewares, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      end() {
        reject({ status: this.statusCode || 401 });
      },
      json() {
        reject({ status: this.statusCode || 401 });
      },
      send() {
        reject({ status: this.statusCode || 401 });
      },
      setHeader() {},
      getHeader() {},
    };

    let i = 0;
    const next = (err) => {
      if (err) return reject(err);
      const mw = middlewares[i++];
      if (!mw) return resolve();
      try {
        mw(req, res, next);
      } catch (e) {
        reject(e);
      }
    };

    next();
  });
}

export function initWs(server, { middlewares = [] } = {}) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      // ORIGIN CHECK (required for cookie-based auth)
      const origin = req.headers.origin;
      if (origin && config.corsOrigins?.length && !config.corsOrigins.includes(origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // AUTH USERS ONLY: Inject Authorization header from HttpOnly cookie
      const token = getCookie(req, "iot_access");
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      if (!req.headers.authorization) {
        req.headers.authorization = `Bearer ${token}`;
      }

      // Run your EXISTING auth chain
      await runMiddlewares(middlewares, req);

      // ---- Normalize identity for WS registry (do NOT change auth middleware files) ----
      const derivedUserId =
        req.userId ??
        req.userID ??
        req.user?.id ??
        req.user?.userId ??
        req.auth?.userId ??
        req.auth?.sub ??
        req.auth?.user_id;
      
      if (derivedUserId != null && !req.userId) req.userId = String(derivedUserId);
      
      // normalize roles too (optional but helpful)
      if (!req.roles && req.auth?.roles) req.roles = req.auth.roles;
      if (!req.user && req.auth) req.user = req.auth;


      // Upgrade connection
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.user = req.user;
        ws.userId = req.userId;
        ws.roles = req.roles;

        wss.emit("connection", ws, req);
      });
    } catch (err) {
      try {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      } catch {}
      socket.destroy();
    }
  });

  // Connection handler
  wss.on("connection", (ws) => {
    ws.isAlive = true;

    // Register socket under this userId (for wsSendToUser)
    addSocket(ws.userId, ws);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    console.log("[WS] connected userId:", ws.userId, "socketsForUser:", userSockets.get(ws.userId)?.size || 0);
    console.log("[WS] totalUsersWithSockets:", userSockets.size);


    ws.on("close", () => {
      removeSocket(ws.userId, ws);
    });

    // Avoid unhandled error events
    ws.on("error", (err) => {
      console.warn("[WS] socket error", err?.message || err);
    });

   ws.on("message", async (raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  console.log("[WS] received message from userId:", ws.userId, "message:", msg);

  if (!msg || typeof msg !== "object") return;

  if (msg.type === "cmd_switch") {
    try {
      const deviceId = String(msg.deviceId || "").trim();
      const metric = String(msg.metric || "").trim();
      const valueBool = msg.valueBool;

      // validate
      if (!deviceId || !metric || typeof valueBool !== "boolean") return;

      // OPTIONAL SAFETY: only allow relay control
      // if (metric !== "relay") {
      //   ws.send(JSON.stringify({ type: "cmd_ack", ok: false, reason: "metric_not_allowed", deviceId, metric }));
      //   return;
      // }

      const userId = ws.userId;
      if (!userId) return;

      // ownership check
      const device = await getDeviceByIdForUser(userId, deviceId);
      if (!device) {
        ws.send(
          JSON.stringify({
            type: "cmd_ack",
            ok: false,
            reason: "not_owner",
            deviceId,
            metric,
          })
        );
        return;
      }

      // publish command
      await publishMessage(
        `tele/${userId}/${metric}`,
        JSON.stringify({
          value_bool: valueBool,
          ts: new Date().toISOString(),
        })
      );

      // ack to sender
      ws.send(
        JSON.stringify({
          type: "cmd_ack",
          ok: true,
          deviceId,
          metric,
          valueBool,
        })
      );
    } catch (e) {
      console.error("[WS] cmd_switch error:", e);
      try {
        ws.send(
          JSON.stringify({
            type: "cmd_ack",
            ok: false,
            reason: "internal",
          })
        );
      } catch {}
    }

    return;
  }

  // other message types can be handled here...
});



    ws.send(
      JSON.stringify({
        type: "connected",
        ts: Date.now(),
        userId: ws.userId,
      })
    );
  });

  // Heartbeat to detect dead connections
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.readyState !== ws.OPEN) continue;

      if (ws.isAlive === false) {
        try {
          removeSocket(ws.userId, ws);
        } catch {}
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {}
    }
  }, 30_000);

  const cleanup = () => {
    clearInterval(interval);
    try {
      wss.close();
    } catch {}

    // cleanup registry (avoid memory leak on server restart)
    userSockets.clear();
  };

  server.on("close", cleanup);
  server.on("error", cleanup);

  return { wss, cleanup };
}
