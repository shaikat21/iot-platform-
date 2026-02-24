// src/services/mqttClient.js
import mqtt from "mqtt";
import { generateBackendJwt } from "../utils/backendJwt.js";
import { config } from "../config/env.js";
import { insertTelemetry } from "../models/telemetryModel.js";
import { getMetricDefinition, initMetricRegistry } from "../middleware/metricRegistry.js";
import { getOwnerIdByDeviceId } from "../models/deviceModel.js"
import { wsSendToUser } from "./wsServer.js";

let client;

export const initMqtt = async () => {
  const url = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;

  await initMetricRegistry();

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
  if (topic.startsWith("cmd/")) {
  console.log("[MQTT] cmd ignored:", topic);
  return;
  }

  let value;

  try {
    const raw = payload.toString();
    try { value = JSON.parse(raw); } catch { value = raw; }

    // tele/<ownerId>/<deviceId>/<position>/<metric>
    const match = topic.match(/^tele\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) return;
    
    const ownerId = match[1];
    const deviceId = match[2];      // WH_Central_Alarm
    const position = match[3];      // east_kitchen
    const metric = match[4];        // vibration / online / rssi


    const def = getMetricDefinition(metric);
    if (!def) {
      console.warn("[MQTT] Unknown metric:", metric);
      return;
    }

    const normalized = def.normalize(value);

    const valueNum =
    def.type === "number"
        ? (Number.isFinite(Number(normalized)) ? Number(normalized) : null)
        : null;
    
    const valueBool = def.type === "boolean" ? normalized : null;
    
    if (def.type === "boolean" && valueBool === null) {
      console.warn("[MQTT] Invalid boolean payload:", topic, raw);
      return;
    }

    await insertTelemetry({
      deviceId,
      position,         
      metric,
      category: def.category,
      unit: def.unit,
      qos: packet.qos,
      topic,
      valueNum,
      valueBool,
    });
    

    // LIVE STREAM to dashboard (per-user WS)
    wsSendToUser(ownerId, {
      type: "telemetry",
      deviceId,
      position,
      metric,
      category: def.category,
      unit: def.unit,
      topic,
      qos: packet.qos,
      valueNum: valueNum ?? null,
      valueBool: valueBool ?? null,
      ts: Date.now(),
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

