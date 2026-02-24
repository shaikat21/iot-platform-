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

type NumericItem = {
  metric: string;
  unit: string | null;
  latestNum: number | null;
  latestTs: string | null;
  labels: string[];
  values: number[];
};

type PositionCard = {
  position: string;

  // status (pill only)
  online: boolean | null;
  onlineTs: string | null;

  // binary sensor
  sensor: boolean | null;
  sensorTs: string | null;

  // relay/switch (controllable)
  relay: boolean | null;
  relayTs: string | null;
  relayMetric: string | null;     // e.g. "relay"
  controllable: boolean;

  // wifi signal etc
  signalNum: number | null;
  signalTs: string | null;

  // ✅ all other numeric metrics (each becomes its own card)
  numerics: NumericItem[];
};


type TileCard =
  | {
      key: string;
      kind: 'position';
      position: string;

      online: boolean | null;
      onlineTs: string | null;

      // optional sensor inside same tile
      sensor: boolean | null;
      sensorTs: string | null;

      // optional relay inside same tile
      relay: boolean | null;
      relayTs: string | null;
      relayMetric: string | null;
      controllable: boolean;
    }
  | {
      key: string;
      kind: 'numeric';
      position: string;
      online: boolean | null;
      onlineTs: string | null;
      numeric: NumericItem;
    };



type DeviceTelemetryView = {
  device: Device;
  cards: TileCard[]; // ✅ now flat tiles
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
  
private metricFromTopic(topic?: string): string | null {
  if (!topic) return null;

  // examples:
  // tele/<...>/WH_Central_Alarm/east_kitchen/online
  // tele/WH_Central_Alarm/north_room/binary_sensor
  const parts = topic.split('/').filter(Boolean);

  // take last segment as metric
  const last = parts[parts.length - 1];
  return last ? String(last) : null;
}

private cardKeyFromRow(r: TelemetryRow): string {
  const any = r as any;

  const pos = any.position as string | undefined;

  // metric is missing from API, derive from topic
  const metric =
    (any.metric as string | undefined) ??
    this.metricFromTopic(any.topic) ??
    undefined;

  const topic = any.topic as string | undefined;

  // ✅ unique per position+metric (status vs sensor)
  if (pos && metric) return `${pos}::${metric}`;

  // ✅ at least unique per position
  if (pos) return pos;

  // fallback
  return metric ?? any.category ?? topic ?? 'unknown';
}



private upsertNumericOnlyIntoCache(deviceId: string, rows: TelemetryRow[]): void {
  const numeric = (rows ?? []).filter(r => typeof (r as any).value_num === 'number');
  if (!numeric.length) return;
  this.upsertRowsIntoCache(deviceId, numeric);
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

      // Phase 1: snapshot (fast status + binary + relay)
      const calls = list.map((d) =>
        this.deviceService.getTelemetry(d.device_id, { limit: 250, resolution: 'snapshot' }).pipe(
          catchError((err) => {
            console.error('[Telemetry] getTelemetry failed for', d.device_id, err);
            return of([] as TelemetryRow[]);
          }),
          map((rows) => ({ device: d, rows }))
        )
      );

      forkJoin(calls).subscribe({
        next: (results) => {
          for (const r of results) {
            this.upsertRowsIntoCache(r.device.device_id, r.rows);
          }

          this.rebuildViews(list);
          this.loading.set(false);

          // Phase 2: series (numeric history only)
          const seriesCalls = list.map((d) =>
            this.deviceService.getTelemetry(d.device_id, { limit: 60, resolution: 'series' }).pipe(
              catchError((err) => {
                console.error('[Telemetry] series failed for', d.device_id, err);
                return of([] as TelemetryRow[]);
              }),
              map((rows) => ({ device: d, rows }))
            )
          );

          forkJoin(seriesCalls).subscribe({
            next: (seriesResults) => {
              for (const r of seriesResults) {
                this.upsertNumericOnlyIntoCache(r.device.device_id, r.rows);
              }
              this.rebuildViews(list);
            },
            error: (err) => {
              console.error('Failed to load telemetry series', err);
            },
          });
        },
        error: (err) => {
          console.error('Failed to load telemetry snapshot', err);
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


setSwitch(deviceId: string, position: string, metric: string, value: boolean) {
  const ok = this.ws.send({
    type: 'cmd_switch',
    deviceId,
    metric,         // keep backend contract
    valueBool: value,
    position,       // optional: include if backend wants it later (safe)
  });

  if (ok) {
    // ✅ optimistic update must use the SAME keying as your cache
    const key = `${position}::${metric}`;

    this.applyLivePoint(deviceId, {
      category: key,
      kind: 'binary',
      ts: new Date().toISOString(),
      valueNum: null,
      valueBool: value,
      controllable: true,
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

  // For binary sensor messages, prefer position as the card key
const pos = msg['position'] ?? null;
const metric = msg['metric'] ?? msg['category'] ?? null;
if (!metric) return;

const key = pos ? `${pos}::${metric}` : metric;

const ts = msg['ts'] as string;
const valueNum = msg['valueNum'];
const valueBool = msg['valueBool'];

const isSwitchMetric =
  metric === 'relay' || metric === 'switch';

const isSwitchCategory = msg['category'] === 'switch';

const kind: 'binary' | 'numeric' =
  (typeof valueBool === 'boolean' || isSwitchCategory) ? 'binary' : 'numeric';



  this.applyLivePoint(deviceId, {
    category: key,
    kind,
    ts,
    valueNum,
    valueBool,
    controllable: msg['category'] === 'switch',
  });

  const deviceList = this.views().map((v) => v.device);
  this.rebuildViews(deviceList);
}

//Decide “status vs sensor” from metric
private cardMetric(key: string): string {
  const parts = key.split('::');
  return parts.length === 2 ? parts[1] : key;
}

private cardPosition(key: string): string | null {
  const parts = key.split('::');
  return parts.length === 2 ? parts[0] : null;
}

isStatusCard(c: CategoryCard): boolean {
  return this.cardMetric(c.category) === 'online';
}

isBinarySensorCard(c: CategoryCard): boolean {
  return this.cardMetric(c.category) === 'binary_sensor';
}





  private upsertRowsIntoCache(deviceId: string, rows: TelemetryRow[]): void {
    console.log('[Telemetry][raw sample]', deviceId, rows?.[0]); 
    if (!this.cardsByDevice.has(deviceId)) this.cardsByDevice.set(deviceId, new Map());
    const map = this.cardsByDevice.get(deviceId)!;

     // group rows by card key (binary -> position, numeric -> category)
    const grouped = new Map<string, TelemetryRow[]>();
    for (const r of rows) {
      const key = this.cardKeyFromRow(r);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }


    for (const [cardKey, list] of grouped.entries()) {
      const hasBool = list.some(r => typeof (r as any).value_bool === 'boolean');

      const metricName = this.splitKey(cardKey).metric;
      
      // treat relay/switch as binary even if backend sends 0/1
      const isSwitchMetric =
        metricName === 'relay' ||
        metricName === 'switch';

// ✅ treat any row with category="switch" as binary even if value_num is 0/1
const isSwitchCategory = list.some(r => (r as any).category === 'switch');

const kind: 'binary' | 'numeric' = (hasBool || isSwitchCategory) ? 'binary' : 'numeric';


      

      const sorted = list
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const lastAny = sorted[sorted.length - 1] as any;
        const rowCategory = (lastAny?.category ?? null) as string | null;
        
        // metric name from "pos::metric"
        const metric = this.splitKey(cardKey).metric;
        
        // ✅ controllable if telemetry row says category === "switch"
        const controllable = rowCategory === 'switch';


      if (kind === 'binary') {
        const last = sorted[sorted.length - 1];

        map.set(cardKey, {
          category: cardKey,
          kind,
          unit: null,
          latestTs: last?.timestamp ?? null,
          latestBool: (last?.value_bool ?? null) as any,
          latestNum: null,
          labels: [],
          values: [],
          controllable,
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

        map.set(cardKey, {
          category: cardKey,
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
    const metricCards = cardMap ? Array.from(cardMap.values()) : [];

    const byPos = new Map<string, PositionCard>();

    for (const c of metricCards) {
      const { pos, metric } = this.splitKey(c.category);

      if (!byPos.has(pos)) {
        byPos.set(pos, {
          position: pos,
          online: null,
          onlineTs: null,
          sensor: null,
          sensorTs: null,
          relay: null,
          relayTs: null,
          relayMetric: null,
          controllable: false,
          signalNum: null,
          signalTs: null,
          numerics: [],
        });
      }

      const pc = byPos.get(pos)!;

      if (metric === 'online') {
        pc.online = c.latestBool;
        pc.onlineTs = c.latestTs;
        continue;
      }

      if (metric === 'binary_sensor') {
        pc.sensor = c.latestBool;
        pc.sensorTs = c.latestTs;
        continue;
      }

      if (c.controllable) {
        pc.relay = c.latestBool;
        pc.relayTs = c.latestTs;
        pc.relayMetric = metric;
        pc.controllable = true;
        continue;
      }

      if (c.kind === 'numeric') {
        pc.numerics.push({
          metric,
          unit: c.unit,
          latestNum: c.latestNum,
          latestTs: c.latestTs,
          labels: c.labels,
          values: c.values,
        });
      }
    }

    // sort numerics inside each position
    for (const p of byPos.values()) {
      p.numerics.sort((a, b) => a.metric.localeCompare(b.metric));
    }

    // ✅ FLATTEN into tile cards
    const tiles: TileCard[] = [];
    
    for (const p of byPos.values()) {
      // ✅ ONE tile per position always
      tiles.push({
        key: `${p.position}::position`,
        kind: 'position',
        position: p.position,
    
        online: p.online,
        onlineTs: p.onlineTs,
    
        sensor: p.sensor,
        sensorTs: p.sensorTs,
    
        relay: p.relay,
        relayTs: p.relayTs,
        relayMetric: p.relayMetric,
        controllable: p.controllable,
      });
    
      // charts remain separate (optional)
      for (const n of p.numerics) {
        tiles.push({
          key: `${p.position}::${n.metric}`,
          kind: 'numeric',
          position: p.position,
          online: p.online,
          onlineTs: p.onlineTs,
          numeric: n,
        });
      }
    }


    // ✅ Sort tiles: signal first, then other numerics, then relay/sensor
    tiles.sort((a, b) => {
      const rank = (t: TileCard) => (t.kind === 'position' ? 0 : 1);
      const r = rank(a) - rank(b);
      if (r) return r;
    
      const posCmp = a.position.localeCompare(b.position);
      if (posCmp) return posCmp;
    
      return a.key.localeCompare(b.key);
    });
    
    
    
    out.push({ device: d, cards: tiles });
  }

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

trackByTile(_: number, c: any) {
  // supports both your PositionCard-based tiles and the flattened numeric tiles
  return (
    c?.id ??
    c?.key ??
    (c?.kind && c?.position
      ? `${c.kind}::${c.position}::${c.relayMetric ?? ''}::${c.numeric?.metric ?? ''}`
      : c?.position ?? _
    )
  );
}


  isBinaryTrue(c: CategoryCard) {
    return c.latestBool === true;
  }

  private isBinaryCategory(category: string): boolean {
  // hard-pinned binary metrics
  return category === 'relay' || category === 'switch';
}

prettyLabel(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

formatHumanTime(ts?: string | null): string {
  if (!ts) return '';

  const date = new Date(ts);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

private splitKey(key: string): { pos: string; metric: string } {
  const parts = String(key).split('::');
  if (parts.length === 2) return { pos: parts[0], metric: parts[1] };
  return { pos: key, metric: key };
}

private isOnlineMetric(metric: string) {
  return metric === 'online';
}
private isBinarySensorMetric(metric: string) {
  return metric === 'binary_sensor';
}

trackByPosition(_: number, c: PositionCard) {
  return c.position;
}




}
