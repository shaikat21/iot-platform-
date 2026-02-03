// src/services/wsServer.js
import { WebSocketServer } from "ws";

function getCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(";").map((s) => s.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    const v = p.slice(idx + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

function runMiddlewares(middlewares, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      end() { reject({ status: this.statusCode || 401 }); },
      json() { reject({ status: this.statusCode || 401 }); },
      send() { reject({ status: this.statusCode || 401 }); },
      setHeader() {},
      getHeader() {},
    };

    let i = 0;
    const next = (err) => {
      if (err) return reject(err);
      const mw = middlewares[i++];
      if (!mw) return resolve();
      try { mw(req, res, next); } catch (e) { reject(e); }
    };

    next();
  });
}
   export function initWs(server, { middlewares = [] } = {}) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    try {
      // Only handle /ws
      const url = new URL(req.url, "http://localhost");
      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      // ORIGIN CHECK (🔒 REQUIRED for cookie-based auth)
      const origin = req.headers.origin;
      if (
        origin &&
        config.corsOrigins.length &&
        !config.corsOrigins.includes(origin)
      ) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Inject Authorization header from HttpOnly cookie
      const token = getCookie(req, "iot_access");
      if (token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${token}`;
      }

      // Run your EXISTING auth chain
      await runMiddlewares(middlewares, req);

      // Upgrade connection
      wss.handleUpgrade(req, socket, head, (ws) => {
        // carry over useful context
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

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected", ts: Date.now() }));
  });

  return { wss };
}
