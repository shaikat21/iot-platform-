// src/app/interface/Devices/device.ts
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../core/service/device.service';
import { Device } from '../../models/device.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AddDeviceDialogComponent } from './add-device-dialog';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subscription , firstValueFrom} from 'rxjs';
import { WsService, WsMessage } from '../../core/service/ws.service';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './device.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private deviceService = inject(DeviceService);
  private dialog = inject(MatDialog);
  private ws = inject(WsService);

  loading = signal(false);
  devices = signal<Device[]>([]);

  hasDevices = computed(() => this.devices().length > 0);

  private wsSub?: Subscription;

  constructor(private oauth: OAuthService) {}

  ngOnInit(): void {
    const token = this.oauth.getAccessToken();
    if (!token) {
      return; // ⛔ Don't call backend before token exists
    }

    console.log('[Dashboard] access token:', token);

    this.loadDevices();

    // WS live device status updates
    this.ws.connect();
    this.wsSub = this.ws.messages$.subscribe((msg) => this.onWsMessage(msg));
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    // If you want WS shared app-wide, remove this disconnect.
    // For dashboard-only live updates, keep it.
    this.ws.disconnect();
  }

  private onWsMessage(msg: WsMessage) {
  if (!msg || typeof msg !== 'object') return;

  console.log('[WS] message:', msg);


  if (msg.type === 'device_status') {
    const deviceId = msg['deviceId'] ?? msg['device_id'];
    if (!deviceId) return;

    const online = !!msg['online'];
    const lastSeen = msg['lastSeen'] ?? msg['last_seen'];

    this.devices.update((arr) => {
      const idx = arr.findIndex((d) => d.device_id === deviceId);
      if (idx === -1) return arr;

      const current = arr[idx];

      const updated: Device = {
        ...current,
        online,
        last_seen: lastSeen ?? current.last_seen,
      } as any;

      const copy = arr.slice();
      copy[idx] = updated;
      return copy;
    });
  }

  if (msg.type === 'telemetry') {
  const deviceId = msg['deviceId'];
  const metric = msg['metric'];
  const valueNum = msg['valueNum'];
  const valueBool = msg['valueBool'];
  const ts = msg['ts'];

  console.log('[WS] telemetry', deviceId, metric, valueNum ?? valueBool, ts);

  
  }
}


  loadDevices(): void {
    this.loading.set(true);
    this.deviceService.listMyDevices().subscribe({
      next: (res: any) => {
        const devices = res.devices ?? res;
        this.devices.set(devices);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load devices', err);
        this.loading.set(false);
      },
    });
  }

  async openAddDeviceDialog(): Promise<void> {
  const catalog = await firstValueFrom(this.deviceService.getMetricCatalog());

  const ref = this.dialog.open(AddDeviceDialogComponent, {
    width: '520px',
    disableClose: true,
    data: { catalog },
  });

  ref.afterClosed().subscribe((result) => {
    if (result) this.loadDevices();
  });
 }

  trackByDeviceId(index: number, d: Device) {
    return d.device_id;
  }

  viewMetrics(device: Device) {
    console.log('View metrics for', device.device_id);
  }
  
 deleteDevice(device: Device) {
  const ok = confirm(`Delete device "${device.name || device.device_id}"?`);
  if (!ok) return;

  this.deviceService.deleteDevice(device.device_id).subscribe({
    next: () => {
      // remove locally (fast UI)
      this.devices.update(arr => arr.filter(d => d.device_id !== device.device_id));
    },
    error: (err) => {
      console.error('Failed to delete device', err);
      alert('Failed to delete device');
    },
  });
}


}
