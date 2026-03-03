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

  backend: {
    anontokenSecret: getEnv("ANON_TOKEN_SECRET"),
    webhookSecret: getEnv("WEBHOOK_SECRET"),
  },

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
    serviceClientId: `${getEnv("ZITADEL_CLIENT_ID")}`,
    serviceClientSecret: `${getEnv("ZITADEL_CLIENT_SECRET")}`,
    serviceClientId2: `${getEnv("ZITADEL_SERVICE_CLIENT_ID2")}`,
    serviceClientSecret2: `${getEnv("ZITADEL_SERVICE_CLIENT_SECRET2")}`,
  },

  device: {
    mqttSecretPull: getEnv("DEVICE_MQTT_SECRET_PULL"),
    deviceBootstrapSecret: getEnv("DEVICE_BOOTSTRAP_SECRET"),
  },

  emqx: {
    authSecret: getEnv("EMQX_AUTH_SECRET"),
  },

  r2: {
    endpoint: getEnv("R2_ENDPOINT"),            // ex: https://<accountid>.r2.cloudflarestorage.com
    accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    bucket: getEnv("R2_BUCKET_NAME"),
    //publicBaseUrl: getEnv("R2_PUBLIC_BASE_URL", ""), // optional (only if you also serve public URLs)
  },

  corsOrigins: getEnv("CORS_ORIGINS", "").split(",").filter(Boolean)
};
