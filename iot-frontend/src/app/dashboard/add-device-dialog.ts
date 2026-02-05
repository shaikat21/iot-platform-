// src/app/dashboard/add-device-dialog.ts

import { Component, inject, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DeviceService } from '../core/service/device.service';
import { CommonModule } from '@angular/common';
import { MatSelectionListChange } from '@angular/material/list';

// keep minimal types local (no new files)
type MetricDef = {
  metric_key: string;
  value_type: 'number' | 'boolean';
  category: string;
  unit: string | null;
};
type MetricCatalogResponse = {
  categories: string[];
  metrics: MetricDef[];
};

@Component({
  selector: 'app-add-device-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    CommonModule,
  ],
  templateUrl: './add-device-dialog.html',
})
export class AddDeviceDialogComponent {
  private dialogRef = inject(MatDialogRef<AddDeviceDialogComponent>);
  private fb = inject(FormBuilder);
  private deviceService = inject(DeviceService);

  loading = false;

  // catalog passed from dashboard.openAddDeviceDialog()
  categories: string[] = [];
  metrics: MetricDef[] = [];

  categoryCtrl = new FormControl<string>('');
  selectedMetricKeys = new Set<string>();

  constructor(@Inject(MAT_DIALOG_DATA) public data: { catalog?: MetricCatalogResponse }) {
    const catalog = data?.catalog;
    if (catalog) {
      this.categories = catalog.categories ?? [];
      this.metrics = catalog.metrics ?? [];
      this.categoryCtrl.setValue(this.categories[0] ?? '');
    }
  }

  form = this.fb.group({
    deviceId: ['', Validators.required],
    name: [''],
    serialNumber: ['', Validators.required],
  });

  onMetricSelectionChange(metricKey: string, e: MatSelectionListChange) {
  // event can include multiple options, but for list-option toggle it’s typically 1
  const selected = e.options?.some(o => o.selected) ?? false;
  this.toggleMetric(metricKey, selected);
}


  metricsForSelectedCategory(): MetricDef[] {
    const c = this.categoryCtrl.value;
    if (!c) return [];
    return this.metrics.filter((m) => m.category === c);
  }

  toggleMetric(metricKey: string, checked: boolean) {
    if (checked) this.selectedMetricKeys.add(metricKey);
    else this.selectedMetricKeys.delete(metricKey);
  }

  close(result?: any) {
    this.dialogRef.close(result);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    const v = this.form.value;

    // keep your existing payload shape + add metadata.metrics
    const body = {
      deviceId: v.deviceId,
      name: v.name,
      serialNumber: v.serialNumber,
      metadata: {
        metrics: Array.from(this.selectedMetricKeys),
      },
    };

    this.deviceService.registerDevice(body as any).subscribe({
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

