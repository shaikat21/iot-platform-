import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const generateBackendJwt = () => {
  return jwt.sign(
    {
      username: config.mqtt.clientId,
      role: "backend"
    },
    process.env.MQTT_JWT_SECRET,
    { expiresIn: "15m" }
  );
};
