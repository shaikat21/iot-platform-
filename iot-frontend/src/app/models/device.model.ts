// src/app/models/device.model.ts
export interface Device {
  device_id: string;
  name: string;
  serial_number: string;
  metadata: Record<string, any> | null;
  online: boolean | null;
  last_seen: string | null; // ISO timestamp
}

export interface TelemetryRow {
  id: number;
  device_id: string;
  payload: Record<string, any>;
  timestamp: string; // ISO timestamp
}
