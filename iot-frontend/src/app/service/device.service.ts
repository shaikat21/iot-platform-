// src/app/services/device.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';
import { Device, TelemetryRow } from '../models/device.model';
import { Observable, map } from 'rxjs';

interface DeviceListResponse {
  devices: Device[];
}

interface RegisterDeviceRequest {
  deviceId: string;
  name: string;
  serialNumber: string;
  deviceType?: string | null;
  metadata?: Record<string, any>;
}

interface RegisterDeviceResponse {
  success: boolean;
  device: Device;
}

interface TelemetryResponse {
  telemetry: TelemetryRow[];
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly http = inject(HttpClient);
  private readonly oauth = inject(OAuthService);
  private readonly baseUrl = environment.api.baseUrl;

  private authHeaders(): HttpHeaders {
    const token = this.oauth.getAccessToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

listMyDevices(): Observable<Device[]> {
  return this.http
    .get<DeviceListResponse>(`${this.baseUrl}/devices`, {
      headers: this.authHeaders(),
    })
    .pipe(
      map((res) => res.devices)
    );
}

  registerDevice(body: RegisterDeviceRequest): Observable<RegisterDeviceResponse> {
    return this.http.post<RegisterDeviceResponse>(
      `${this.baseUrl}/devices`,
      body,
      { headers: this.authHeaders() }
    );
  }

  getDevice(deviceId: string): Observable<Device> {
    return this.http.get<Device>(
      `${this.baseUrl}/devices/${encodeURIComponent(deviceId)}`,
      { headers: this.authHeaders() }
    );
  }

getTelemetry(deviceId: string, limit = 50): Observable<TelemetryRow[]> {
  return this.http
    .get<TelemetryResponse>(
      `${this.baseUrl}/telemetry/${encodeURIComponent(deviceId)}?limit=${limit}`,
      { headers: this.authHeaders() }
    )
    .pipe(map((res) => res.telemetry));
}

}
