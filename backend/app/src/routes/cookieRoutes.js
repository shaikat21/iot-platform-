// src/routes/cookieRoutes.js
import Router from "express";
import { config } from "../config/env.js";
import { requireAuth } from "../auth/requireAuth.js";
import { authorize } from "../auth/authorize.js";

const router = Router();

function pickCookieDomainFromCorsOrigins(corsOrigins = []) {
  // Prefer a real domain (not localhost). If not found, return null (host-only cookie)
  const first = corsOrigins
    .map((o) => {
      try { return new URL(o).hostname; } catch { return null; }
    })
    .filter(Boolean)
    .find((h) => h !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(h));

  if (!first) return null;

  // If already a subdomain like dev.myimprint.ca -> cookie domain should be .myimprint.ca
  const parts = first.split(".");
  if (parts.length >= 2) {
    const base = parts.slice(-2).join(".");
    return `.${base}`;
  }
  return null;
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

// POST /api/cookie  -> set cookie from Authorization Bearer token
router.post(
  "/",
  requireAuth,
  authorize(["admin", "user", "developer"]),
  (req, res) => {
    const auth = req.headers["authorization"];
    const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

    if (!token) return res.status(400).json({ error: "Missing Bearer token" });

    const cookieDomain = pickCookieDomainFromCorsOrigins(config.corsOrigins);

    res.cookie("iot_access", token, {
      httpOnly: true,
      secure: isProd(),           // true in prod (https)
      sameSite: "lax",            // good for same-site (app/api on same parent domain)
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      maxAge: 10 * 60 * 1000,     // 10 minutes (keep short)
    });

    return res.json({
      ok: true,
      cookieDomain: cookieDomain || "(host-only)",
    });
  }
);

// DELETE /api/cookie -> clear cookie
router.delete(
  "/",
  requireAuth,
  authorize(["admin", "user", "developer"]),
  (req, res) => {
    const cookieDomain = pickCookieDomainFromCorsOrigins(config.corsOrigins);

    res.clearCookie("iot_access", {
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    return res.json({ ok: true });
  }
);

export default router;
