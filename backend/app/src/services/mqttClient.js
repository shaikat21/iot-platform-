// src/services/mqttClient.js
import mqtt from "mqtt";
import { generateBackendJwt } from "../utils/backendJwt.js";
import { config } from "../config/env.js";
import { insertTelemetry } from "../models/telemetryModel.js";
import { METRIC_DEFINITIONS } from "../middleware/metricRegistry.js";

let client;

export const initMqtt = () => {
  const url = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;

  const connectWithJwt = () => {
    const token = generateBackendJwt();

    return mqtt.connect(url, {
      clientId: config.mqtt.clientId,
      username: config.mqtt.clientId, //config.mqtt.username || undefined,
      password: token,
      reconnectPeriod: 3000,
      keepalive: 30,
      rejectUnauthorized: true,
    });
  };

  client = connectWithJwt();

  client.on("connect", () => {
    console.log("[MQTT] Connected to EMQX");

    //subscribe to everything 
     client.subscribe(
    [
      "tele/#", // telemetry
      //"cmd/t/+/d/+/#",  // command
    ],
    { qos: 1 },
    err => {
      if (err) console.error("[MQTT] Subscribe error:", err.message);
      else console.log("[MQTT] Subscribed");
    }
  );

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

  client.on("message", async (topic, payload, packet) => {
  let value;

  try {
    const raw = payload.toString();
    try { value = JSON.parse(raw); } catch { value = raw; }

    // tele/<deviceId>/<metric>
    const match = topic.match(/^tele\/([^/]+)\/([^/]+)$/);
    if (!match) return;

    const deviceId = match[1];
    const metric = match[2];

    const def = METRIC_DEFINITIONS[metric];
    if (!def) {
      console.warn("[MQTT] Unknown metric:", metric);
      return;
    }

    const normalized = def.normalize(value);

    const valueNum = def.type === "number" ? Number(normalized) : null;
    const valueBool = def.type === "boolean" ? Boolean(normalized) : null;

    await insertTelemetry({
      deviceId,
      metric,
      category: def.category,
      unit: def.unit,
      qos: packet.qos,
      topic,
      valueNum,
      valueBool,
    });

    console.log(
      "[MQTT] saved:",
      deviceId,
      metric,
      def.type === "number" ? valueNum : valueBool,
      def.unit ?? ""
    );
  } catch (err) {
    console.error("[MQTT] handler error:", err);
  }
});




 //error log 
 client.on("disconnect", pkt => console.log("[MQTT] disconnect:", pkt));
 client.on("close", () => console.log("[MQTT] close"));
 client.on("error", err => console.log("[MQTT] error:", err.message));


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

