// src/auth/zitadelAuth.js

// ---- Do not edit anything in this file ----//

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { config } from "../config/env.js";

const client = jwksClient({
  jwksUri: config.zitadel.jwksUri,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export const zitadelAuth = (req, res, next) => {

  const header = req.headers["authorization"];

  if (!header) {
    req.auth = undefined;
    return next();
  }

  const token = header.split(" ")[1];

  if (!token) {
    req.auth = undefined;
    return next();
  }

  jwt.verify(
    token,
    getKey,
    {
      issuer: config.zitadel.issuer,
      algorithms: ["RS256"],
      ignoreExpiration: false,
    },
    (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid auth token" });
      }

      req.auth = decoded;
      next();
    }
  );
};
