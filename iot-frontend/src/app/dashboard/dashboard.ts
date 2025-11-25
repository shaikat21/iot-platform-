// src/app/dashboard/dashboard.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../service/device.service';
import { Device } from '../models/device.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AddDeviceDialogComponent } from './add-device-dialog';
import { OAuthService } from 'angular-oauth2-oidc';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private deviceService = inject(DeviceService);
  private dialog = inject(MatDialog);

  loading = signal(false);
  devices = signal<Device[]>([]);

  hasDevices = computed(() => this.devices().length > 0);
  constructor(
    private oauth: OAuthService
  ) {}

  ngOnInit(): void {
   const token = this.oauth.getAccessToken();
  if (!token) {
    return; // ⛔ Don't call backend before token exists
  }
    console.log('[Dashboard] access token:', this.oauth.getAccessToken());
    this.loadDevices();
  }

  loadDevices(): void {
    this.loading.set(true);
    this.deviceService.listMyDevices().subscribe({
      next: (res: any) => {
        // if you add map(r => r.devices) in the service, just set res directly
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

  openAddDeviceDialog(): void {
    const ref = this.dialog.open(AddDeviceDialogComponent, {
      width: '400px',
      disableClose: true,
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadDevices();
      }
    });
  }

  trackByDeviceId(index: number, d: Device) {
    return d.device_id;
  }

  // For metrics view later – you can call getTelemetry from DeviceService
  viewMetrics(device: Device) {
    console.log('View metrics for', device.device_id);
    // e.g. navigate to /dashboard/device/:id or open another dialog
  }


}

