// src/auth/zitadelAuth.js
import { expressjwt as jwt } from "express-jwt";
import jwks from "jwks-rsa";

export const zitadelAuth = jwt({
  secret: jwks.expressJwtSecret({
    jwksUri: "http://192.168.0.104:8085/oauth/v2/keys",
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  }),
  //audience: "iot-device",              
  issuer: "http://192.168.0.104:8085", 
  algorithms: ["RS256"],
  requestProperty: "auth",
});
