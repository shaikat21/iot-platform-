import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const generateBackendJwt = () => {
  return jwt.sign(
    {
      username: config.mqtt.clientId,
      role: "backend"
    },
    config.emqx.authSecret,
    { expiresIn: "15m" }
  );
};
