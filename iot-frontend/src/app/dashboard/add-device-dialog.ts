// src/app/dashboard/add-device-dialog.ts
import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DeviceService } from '../service/device.service';

@Component({
  selector: 'app-add-device-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add Device</h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()" style="padding: 1rem;">
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Device ID</mat-label>
        <input matInput formControlName="deviceId" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Serial Number</mat-label>
        <input matInput formControlName="serialNumber" required />
      </mat-form-field>

      <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
        <button mat-button type="button" (click)="close()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  `,
})
export class AddDeviceDialogComponent {
  private dialogRef = inject(MatDialogRef<AddDeviceDialogComponent>);
  private fb = inject(FormBuilder);
  private deviceService = inject(DeviceService);

  loading = false;

  form = this.fb.group({
    deviceId: ['', Validators.required],
    name: [''],
    serialNumber: ['', Validators.required],
  });

  close(result?: any) {
    this.dialogRef.close(result);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    this.deviceService.registerDevice(this.form.value as any).subscribe({
      next: (res) => {
        this.loading = false;
        this.close(res.device);
      },
      error: (err) => {
        console.error('Failed to register device', err);
        this.loading = false;
      },
    });
  }
}
