// Backend/app/src/routes/anonTokenRoutes.js

import { Router } from "express";
import fetch from "node-fetch";
import { config } from "../config/env.js";
import { rateLimit } from "../utils/rateLimit.js";
import { VerifyAnonTokenKey } from "../middleware/VerifyAnonTokenKey.js"
import {
  getCachedAnonToken,
  setCachedAnonToken
} from "../utils/anonTokenCache.js";

const router = Router();

/**
 * FE calls this WITHOUT token
 * BE fetches anon token using service user
 */
router.post("/auth/anontoken", 
    rateLimit,
    VerifyAnonTokenKey,
    async (_req, res) => {
  try {
    // 1. cache hit
    const cached = getCachedAnonToken();
    if (cached) {
      console.log ("Anon cache hit");
      return res.json(cached);
    }
      console.log ("Anon cache miss, calling zitadel");

    // 2. cache miss → Zitadel
    const tokenRes = await fetch(config.zitadel.tokenUri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.zitadel.serviceClientId,
        client_secret: config.zitadel.serviceClientSecret,
        scope: "openid profile email"
      })
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Zitadel anon token failed:", err);
      return res.status(500).json({ error: "anon_token_failed" });
    }

    const token = await tokenRes.json();

    const response = {
      access_token: token.access_token,
      expires_in: token.expires_in,
      token_type: "Bearer",
      role: "anon"
    };

    // 3. store in cache
    setCachedAnonToken(response, token.expires_in);

    return res.json(response);

  } catch (err) {
    console.error("Anon token error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
