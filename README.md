# 🚀 IoT Backend – API Documentation

Base URL:

```
http://192.168.0.104:8086/api
```

This backend uses **dual authentication**:

- **User Auth (Zitadel JWT)** → manage devices, read telemetry  
- **Device Auth (Device JWT)** → send telemetry only  

---

## 🔐 Authentication

### **User Token (Zitadel)**
Used for:
- Register device  
- List devices  
- Get device details  
- Issue device token  
- Read telemetry  

### **Device Token (HS256)**
Generated from:
```
POST /devices/:deviceId/token
```
Used for:
- Sending telemetry from ESP32

---

# 📦 Devices API

## **POST /devices**
Register a new device.

**Auth:**  
```
Authorization: Bearer <SERVICE_TOKEN>
```

**Body:**
```json
{
  "deviceId": "ESP32-TEST",
  "name": "Test Device",
  "serialNumber": "SERIAL-123",
  "metadata": { "location": "Machine Test" }
}
```

---

## **GET /devices**
List all devices owned by the authenticated user.

**Auth:**  
```
Authorization: Bearer <SERVICE_TOKEN>
```

---

## **GET /devices/:deviceId**
Fetch device details.

**Auth:**  
```
Authorization: Bearer <SERVICE_TOKEN>
```

---

## **POST /devices/:deviceId/token**
Generate a device token (for ESP32).

**Auth:**  
```
Authorization: Bearer <SERVICE_TOKEN>
```

---

# 📡 Telemetry API

## **POST /telemetry/:deviceId**
Device sends telemetry.

**Auth:**  
```
Authorization: Bearer <DEVICE_TOKEN>
```

**Body Example:**
```json
{
  "temperature": 23.5,
  "humidity": 60,
  "wifi": -72
}
```

---

## **GET /telemetry/:deviceId?limit=100**
User reads telemetry history.

**Auth:**  
```
Authorization: Bearer <SERVICE_TOKEN>
```

---

# 🗄 Database Schema

## devices
- device_id  
- owner_id  
- name  
- serial_number  
- device_type  
- device_token  
- metadata  
- online  
- last_seen  

## telemetry
- id  
- device_id  
- payload  
- timestamp  

## device_events
- id  
- device_id  
- event_type  
- data  
- timestamp  

---

# 🧪 Example cURL Commands

### Register device
```
curl -X POST {{BASE_URL}}/api/devices   -H "Authorization: Bearer {{SERVICE_TOKEN}}"   -H "Content-Type: application/json"   -d '{"deviceId":"ESP32-TEST","name":"Test Device","serialNumber":"SERIAL-123","metadata":{"location":"Machine Test"}}'
```

### Issue device token
```
curl -X POST {{BASE_URL}}/api/devices/ESP32-TEST/token   -H "Authorization: Bearer {{SERVICE_TOKEN}}"
```

### Device send telemetry
```
curl -X POST {{BASE_URL}}/api/telemetry/ESP32-TEST   -H "Authorization: Bearer {{DEVICE_TOKEN}}"   -H "Content-Type: application/json"   -d '{"temperature":23.5,"humidity":60,"wifi":-72}'
```

---
