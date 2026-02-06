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
  device_id: string;
  category: string;
  unit?: string | null;
  value_num?: number | null;
  value_bool?: boolean | null;
  timestamp: string; // ISO
}
