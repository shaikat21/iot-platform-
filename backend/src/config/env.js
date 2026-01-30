// src/config/env.js
import dotenv from "dotenv";

dotenv.config();

const getEnv = (key, defaultValue = undefined) => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value ?? defaultValue;
};

export const config = {
  port: Number(getEnv("PORT", 8081)),
  nodeEnv: getEnv("NODE_ENV", "development"),

  db: {
    url: getEnv("DATABASE_URL")
  },

  zitadel: {
    audience: process.env.ZITADEL_AUDIENCE,
    issuer: `${process.env.ZITADEL_ISSUER}/oauth/v2`,
    algorithms: ["RS256"],

  },

  deviceJwtSecret: getEnv("DEVICE_JWT_SECRET"),

  mqtt: {
    host: getEnv("MQTT_HOST", "emqx"),
    port: Number(getEnv("MQTT_PORT", 1883)),
    username: getEnv("MQTT_USERNAME", ""),
    password: getEnv("MQTT_PASSWORD", ""),
    clientId: getEnv("MQTT_CLIENT_ID", "backend-api")
  },

  zitadel: {
    issuer: getEnv("ZITADEL_ISSUER"),
    projectId: getEnv("ZITADEL_PROJECT_ID"),
    jwksUri: `${getEnv("ZITADEL_ISSUER")}/oauth/v2/keys`,
    userInfoUri: `${getEnv("ZITADEL_ISSUER")}/oidc/v1/userinfo`,
    tokenUri: `${getEnv("ZITADEL_ISSUER")}/oauth/v2/token`,
    serviceClientId: `${getEnv("ZITADEL_SERVICE_CLIENT_ID")}`,
    serviceClientSecret: `${getEnv("ZITADEL_SERVICE_CLIENT_SECRET")}`,
    serviceClientId2: `${getEnv("ZITADEL_SERVICE_CLIENT_ID2")}`,
    serviceClientSecret2: `${getEnv("ZITADEL_SERVICE_CLIENT_SECRET2")}`,
  },

  corsOrigins: getEnv("CORS_ORIGINS", "").split(",").filter(Boolean)
};
