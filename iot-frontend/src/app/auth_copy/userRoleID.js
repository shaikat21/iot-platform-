// src/auth/userRoleID.js

// ---- Do not edit anything in this file ----//

import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

const PROJECT_ID = config.zitadel.projectId;
const ROLE_CLAIM = `urn:zitadel:iam:org:project:${PROJECT_ID}:roles`;

export const userID = (req, res, next) => {
  const header = req.headers["authorization"];

  // ⭐ Allow guest (NO token)
  if (!header) {
    req.auth = undefined;
    return next();
  }

  const token = header.split(" ")[1];
  if (!token) {
    req.auth = undefined;
    return next();
  }

  try {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.payload) {
      req.auth = undefined;
      return next();
    }

    req.auth = decoded.payload;

    // ---- Role Extraction ---- //
    const roleClaim = req.auth[ROLE_CLAIM] || {};
    let roles = Object.keys(roleClaim);
    if (req.auth.iss === config.zitadel.issuer && !roles.length) {
      roles = ["anon"];
    }
    req.auth.roles = roles;
    req.auth.isAdmin = roles.includes("admin");
    req.auth.isAnon = roles.includes("anon");
    req.auth.isUser = roles.includes("user");
    req.auth.userId = req.auth.sub || null;
    return next();
  } catch (err) {
    console.error("[auth] decode failed:", err);
    req.auth = undefined; // ⭐ Allow guest
    return next();
  }
};

export const getUserIdFromRequest = (req) => {
  return req?.auth?.sub || null;
};

export function getUserRoles(decodedToken) {
  if (!decodedToken) return [];
  const roleClaim = decodedToken[ROLE_CLAIM] || {};
  return Object.keys(roleClaim);
}
