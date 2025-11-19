// src/services/mqttClient.js
import mqtt from "mqtt";
import { config } from "../config/env.js";

let client;

export const initMqtt = () => {
  const url = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;

  client = mqtt.connect(url, {
    clientId: config.mqtt.clientId,
    username: config.mqtt.username || undefined,
    password: config.mqtt.password || undefined,
    reconnectPeriod: 3000,
    keepalive: 60
  });

  client.on("connect", () => {
    console.log("[MQTT] Connected to EMQX");
  });

  client.on("reconnect", () => {
    console.log("[MQTT] Reconnecting...");
  });

  client.on("error", err => {
    console.error("[MQTT] Error:", err.message);
  });

  client.on("close", () => {
    console.log("[MQTT] Connection closed");
  });

  // You can subscribe to control topics if needed:
  // client.subscribe("devices/+/status");

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
