import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DeviceService } from '../../../core/service/device.service';
import { Device, TelemetryRow } from '../../../models/device.model';
import { WsService, WsMessage } from '../../../core/service/ws.service';

import { TelemetryChartComponent } from '../../../shared/components/telemetry-chart';

type CategoryCard = {
  category: string;
  kind: 'binary' | 'numeric';
  unit: string | null;
  latestTs: string | null;
  latestNum: number | null;


  // binary
  latestBool: boolean | null;

  // numeric rolling series
  labels: string[];
  values: number[];
  controllable?: boolean;
};

type DeviceTelemetryView = {
  device: Device;
  cards: CategoryCard[]; // per device
};

@Component({
  selector: 'app-telemetry-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TelemetryChartComponent,
  ],
  templateUrl: './telemetry.html',
  styleUrls: ['./telemetry.css'],
})
export class TelemetryComponent implements OnInit, OnDestroy {
  private deviceService = inject(DeviceService);
  private ws = inject(WsService);

  loading = signal(false);

  // UI model: list of devices, each with cards
  views = signal<DeviceTelemetryView[]>([]);
  hasAny = computed(() => this.views().length > 0);

  // in-memory cache (no localStorage)
  private cardsByDevice = new Map<string, Map<string, CategoryCard>>();

  private wsSub?: Subscription;

  private readonly MAX_POINTS = 60;

  ngOnInit(): void {
    this.loadAllDevicesAndTelemetry();

    this.ws.connect();
    this.wsSub = this.ws.messages$.subscribe((msg) => this.onWsMessage(msg));
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.ws.disconnect();
  }

  private loadAllDevicesAndTelemetry(): void {
    this.loading.set(true);

    this.deviceService.listMyDevices().subscribe({
      next: (devices) => {
        const list = devices ?? [];
        if (!list.length) {
          this.views.set([]);
          this.loading.set(false);
          return;
        }

        // fetch initial telemetry for each device (raw latest N)
        const calls = list.map((d) =>
          this.deviceService.getTelemetry(d.device_id, { limit: 50, resolution: 'raw' }).pipe(
            catchError((err) => {
              console.error('[Telemetry] getTelemetry failed for', d.device_id, err);
              return of([] as TelemetryRow[]);
            }),
            map((rows) => ({ device: d, rows }))
          )
        );

        forkJoin(calls).subscribe({
          next: (results) => {
            // build cache + view
            for (const r of results) {
              this.upsertRowsIntoCache(r.device.device_id, r.rows);
            }
            this.rebuildViews(list);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Failed to load telemetry', err);
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        console.error('Failed to load devices', err);
        this.loading.set(false);
      },
    });
  }

   setSwitch(deviceId: string, metric: string, value: boolean) {
    const ok = this.ws.send({
      type: 'cmd_switch',
      deviceId,
      metric,
      valueBool: value,
    });
  
    if (ok) {
      // optimistic update (relay only)
      this.applyLivePoint(deviceId, {
        category: metric,
        kind: 'binary',
        ts: new Date().toISOString(),
        valueNum: null,
        valueBool: value,
        controllable: this.isBinaryCategory(metric),
      });
      this.rebuildViews(this.views().map(v => v.device));
    }
  }




   private onWsMessage(msg: WsMessage): void {
  if (!msg || typeof msg !== 'object') return;

  // ✅ handle command ack FIRST
  if (msg.type === 'cmd_ack') {
    if (!msg['ok']) {
      console.warn('[CMD] failed', msg['reason'], msg);
    }
    return;
  }

  // telemetry only beyond this point
  if (msg.type !== 'telemetry') return;

  const deviceId = msg['deviceId'];
  if (!deviceId) return;

  const category = msg['category'] ?? msg['metric'];
  if (!category) return;

  const ts = msg['ts'] as string;
  const valueNum = msg['valueNum'];
  const valueBool = msg['valueBool'];

  const kind: 'binary' | 'numeric' =
    typeof valueBool === 'boolean' ? 'binary' : 'numeric';

  this.applyLivePoint(deviceId, {
    category,
    kind,
    ts,
    valueNum,
    valueBool,
    controllable: this.isBinaryCategory(category),
  });

  const deviceList = this.views().map((v) => v.device);
  this.rebuildViews(deviceList);
}



  private upsertRowsIntoCache(deviceId: string, rows: TelemetryRow[]): void {
    if (!this.cardsByDevice.has(deviceId)) this.cardsByDevice.set(deviceId, new Map());
    const map = this.cardsByDevice.get(deviceId)!;

    // group rows by category
    const grouped = new Map<string, TelemetryRow[]>();
    for (const r of rows) {
      const key = r.category;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    for (const [category, list] of grouped.entries()) {
      const kind: 'binary' | 'numeric' =
        this.isBinaryCategory(category) ||
        list.some((r) => typeof (r as any).value_bool === 'boolean')
          ? 'binary'
          : 'numeric';
      

      const sorted = list
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (kind === 'binary') {
        const last = sorted[sorted.length - 1];

        map.set(category, {
          category,
          kind,
          unit: null,
          latestTs: last?.timestamp ?? null,
          latestBool: (last?.value_bool ?? null) as any,
          latestNum: null,
          labels: [],
          values: [],
          controllable: this.isBinaryCategory(category),
        });
      } else {
        let unit: string | null = null;
        const labels: string[] = [];
        const values: number[] = [];

        for (const r of sorted) {
          const v = r.value_num;
          if (typeof v !== 'number') continue;
          unit = unit ?? (r.unit ?? null);
          labels.push(this.formatTs(r.timestamp));
          values.push(v);
        }

        const trimmed = this.trimSeries(labels, values);
        const lastNum = values.length ? values[values.length - 1] : null;

        map.set(category, {
          category,
          kind,
          unit,
          latestTs: sorted[sorted.length - 1]?.timestamp ?? null,
          latestBool: null,
          latestNum: lastNum,
          labels: trimmed.labels,
          values: trimmed.values,
        });
      }
    }
  }

  private applyLivePoint(
    deviceId: string,
    p: {
        category: string;
        kind: 'binary' | 'numeric';
        ts: string;
        valueNum: any;
        valueBool: any;
        controllable?: boolean;
      }

  ): void {
    if (!this.cardsByDevice.has(deviceId)) this.cardsByDevice.set(deviceId, new Map());
    const map = this.cardsByDevice.get(deviceId)!;

    const existing = map.get(p.category);

    if (p.kind === 'binary') {
      map.set(p.category, {
        category: p.category,
        kind: 'binary',
        unit: null,
        latestTs: p.ts ?? existing?.latestTs ?? null,
        latestBool: typeof p.valueBool === 'boolean' ? p.valueBool : existing?.latestBool ?? null,
        latestNum: null,
        labels: [],
        values: [],
        controllable: p.controllable ?? existing?.controllable ?? false,
      });
      return;
    }

    // numeric
    if (typeof p.valueNum !== 'number') return;

    const labels = (existing?.labels ?? []).slice();
    const values = (existing?.values ?? []).slice();

    labels.push(this.formatTs(p.ts));
    values.push(p.valueNum);

    const trimmed = this.trimSeries(labels, values);
    const latestNum = p.valueNum;

    map.set(p.category, {
      category: p.category,
      kind: 'numeric',
      unit: existing?.unit ?? null,
      latestTs: p.ts ?? existing?.latestTs ?? null,
      latestBool: null,
      latestNum,
      labels: trimmed.labels,
      values: trimmed.values,
    });
  }

  private rebuildViews(devices: Device[]): void {
    const out: DeviceTelemetryView[] = [];

    for (const d of devices) {
      const cardMap = this.cardsByDevice.get(d.device_id);
      const cards = cardMap ? Array.from(cardMap.values()) : [];

      // stable order: binary first, then alpha
      cards.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'binary' ? -1 : 1;
        return a.category.localeCompare(b.category);
      });

      out.push({ device: d, cards });
    }

    // stable device order (keep listMyDevices order)
    this.views.set(out);
  }

  private trimSeries(labels: string[], values: number[]) {
    if (labels.length <= this.MAX_POINTS) return { labels, values };
    const start = labels.length - this.MAX_POINTS;
    return { labels: labels.slice(start), values: values.slice(start) };
  }

  private formatTs(ts?: string) {
    if (!ts) return '';
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  trackByDevice(_: number, v: DeviceTelemetryView) {
    return v.device.device_id;
  }

  trackByCategory(_: number, c: CategoryCard) {
    return c.category;
  }

  isBinaryTrue(c: CategoryCard) {
    return c.latestBool === true;
  }

  private isBinaryCategory(category: string): boolean {
  // hard-pinned binary metrics
  return category === 'relay' || category === 'switch';
}

}
