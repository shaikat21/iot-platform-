import jwt from "jsonwebtoken";

export const generateBackendJwt = () => {
  return jwt.sign(
    {
      username: process.env.MQTT_USERNAME,
      role: "backend"
    },
    process.env.MQTT_JWT_SECRET,
    { expiresIn: "24h" }
  );
};
