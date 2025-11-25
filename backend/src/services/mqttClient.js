// src/services/mqttClient.js
import mqtt from "mqtt";
import { generateBackendJwt } from "../utils/backendJwt.js";
import { config } from "../config/env.js";

let client;

export const initMqtt = () => {
  const url = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;

  const connectWithJwt = () => {
    const token = generateBackendJwt();

    return mqtt.connect(url, {
      clientId: config.mqtt.clientId,
      username: config.mqtt.username || undefined,
      password: token,
      reconnectPeriod: 3000,
      keepalive: 30,
    });
  };

  client = connectWithJwt();

  client.on("connect", () => {
    console.log("[MQTT] Connected to EMQX");
  });

  client.on("reconnect", () => {
    console.log("[MQTT] Reconnecting...");

    // Replace password BEFORE reconnecting
    client.options.password = generateBackendJwt();
  });

  client.on("error", err => {
    console.error("[MQTT] Error:", err.message);
  });

  client.on("close", () => {
    console.log("[MQTT] Connection closed");
  });

  return client;
};

export const getMqttClient = () => {
  if (!client) throw new Error("MQTT not initialized");
  return client;
};

export const publishMessage = (topic, payload, options = { qos: 1 }) => {
  if (!client || !client.connected) {
    console.warn("[MQTT] Not connected, skip publish:", topic);
    return;
  }
  const msg = typeof payload === "string" ? payload : JSON.stringify(payload);
  client.publish(topic, msg, options, err => {
    if (err) console.error("[MQTT] Publish error:", err.message);
  });
};
