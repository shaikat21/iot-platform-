// src/routes/meRoutes.js
import { Router } from "express";
import { config } from "../config/env.js";
import { zitadelAuth } from "../auth/zitadelAuth.js";
import { checkAudience } from "../auth/checkAudience.js";
import { userID } from "../auth/userRoleID.js";
import { getCachedMe, setCachedMe } from "../utils/meCache.js";
import fetch from "node-fetch";


const router = Router();

router.get("/",
  zitadelAuth,
  checkAudience,
  userID,
  async (req, res) => {


  const header = req.headers["authorization"];
  const token = header?.startsWith("Bearer ")
    ? header.split(" ")[1]
    : null;

  // To indentify anon token
  const isAnon =
  req.auth &&
  req.auth.client_id &&
  !req.auth.email &&
  !req.auth.roles?.length;

  /* ──────────────────────────────────────────────
     1 Guest / anon (NO token at all)
  ────────────────────────────────────────────── */
  if (!token || isAnon) {
    return res.json({
      userId: null,
      roles: ["anon"],
      guest: true
    });
  }
  

  /* ──────────────────────────────────────────────
     2 Token present but auth missing → INVALID
     (signature failed / middleware mis-configured)
  ────────────────────────────────────────────── */
  if (!req.auth) {
    return res.status(401).json({
      error: "Invalid token"
    });
  }

   // 3 -5  Cache hit (skip Zitadel)
  const cached = getCachedMe(token);
  if (cached) {
    console.log("[ME] cache HIT");
    return res.json(cached);
  }
    console.log("[ME] cache MISS → calling Zitadel");

  /* ──────────────────────────────────────────────
     3 Fetch Zitadel /userinfo (authoritative)
  ────────────────────────────────────────────── */
  let userinfo;
  try {
    const response = await fetch(config.zitadel.userInfoUri, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      // Token exists but is NOT valid anymore
      return res.status(401).json({
        error: "Invalid or expired token"
      });
    }
    userinfo = await response.json();
  } catch (err) {
    console.error("userinfo fetch failed:", err);
    return res.status(401).json({
      error: "Unable to validate session"
    });
  }
  /* ──────────────────────────────────────────────
     4 HARD FAIL if userinfo is empty
     (this blocks signature-tampered tokens)
  ────────────────────────────────────────────── */
  if (!userinfo?.sub) {
    return res.status(401).json({
      error: "Invalid token"
    });
  }
  /* ──────────────────────────────────────────────
     5 Unified trusted response
  ────────────────────────────────────────────── */
  const result = {
    userId: req.auth.userId,
    roles: req.auth.roles || [],
    email: userinfo.email ?? null,
    name: userinfo.name ?? null,
    emailVerified: userinfo.email_verified ?? null,
    aud: req.auth.audience,
    //raw: {
    //  auth: req.auth,
    //  userinfo
    //}
    };

  //cache AFTER full validation
    setCachedMe(token, result);

    return res.json(result);
  }
);

export default router;
