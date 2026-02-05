// FE/FE/app/core/service/ws.service.ts
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type WsConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WsMessage {
  type: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class WsService {
  private ws: WebSocket | null = null;

  private readonly state$ = new BehaviorSubject<WsConnectionState>('disconnected');
  private readonly messagesSubject = new Subject<WsMessage>();

  /** Public streams */
  readonly connectionState$: Observable<WsConnectionState> = this.state$.asObservable();
  readonly messages$: Observable<WsMessage> = this.messagesSubject.asObservable();

  /** Reconnect control */
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private manualClose = false;

  constructor(private zone: NgZone) {}

  /** Connect (idempotent). Cookies are sent automatically by the browser for this host. */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.manualClose = false;
    this.clearReconnectTimer();

    const url = this.buildWsUrl(environment.api.baseUrl);

    this.setState('connecting');

    // WebSocket callbacks must update Angular state inside the zone.
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.zone.run(() => {
        this.reconnectAttempts = 0;
        this.setState('connected');
      });
    };

    this.ws.onmessage = (ev) => {
      this.zone.run(() => {
        const msg = this.safeParse(ev.data);
        if (!msg) return;
        this.messagesSubject.next(msg);
      });
    };

    this.ws.onerror = () => {
      this.zone.run(() => {
        // onclose will follow in most browsers; mark error anyway
        this.setState('error');
      });
    };

    this.ws.onclose = () => {
      this.zone.run(() => {
        this.ws = null;

        // If user intentionally disconnected, do not reconnect.
        if (this.manualClose) {
          this.setState('disconnected');
          return;
        }

        // Auto-reconnect with backoff
        this.setState('disconnected');
        this.scheduleReconnect();
      });
    };
  }

  /** Disconnect and stop reconnecting. */
  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();

    try {
      this.ws?.close(1000, 'client disconnect');
    } catch {
      // ignore
    } finally {
      this.ws = null;
      this.setState('disconnected');
    }
  }

  /** Send a JSON message (optional). */
  send(message: WsMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  // --------------------
  // Internals
  // --------------------

  private setState(s: WsConnectionState) {
    this.state$.next(s);
  }

  private scheduleReconnect(): void {
    // Exponential backoff with cap + jitter (enterprise-safe)
    const attempt = Math.min(this.reconnectAttempts++, 8);
    const base = Math.min(30_000, 500 * Math.pow(2, attempt)); // 0.5s → 30s
    const jitter = Math.floor(Math.random() * 250);
    const delay = base + jitter;

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private safeParse(data: any): WsMessage | null {
    if (data == null) return null;
    if (typeof data === 'object') return data as WsMessage;

    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as WsMessage;
      } catch {
        // ignore non-JSON messages
        return null;
      }
    }
    return null;
  }

  /**
   * Your backend WS path is `/ws` (NOT `/api/ws`).
   * FE environment.api.baseUrl includes `/api`, so strip it.
   * http -> ws, https -> wss
   */
  private buildWsUrl(apiBaseUrl: string): string {
    const base = apiBaseUrl.replace(/\/api\/?$/i, '');
    // base like: http://192.168.0.104:8086
    if (base.startsWith('https://')) return base.replace('https://', 'wss://') + '/ws';
    if (base.startsWith('http://')) return base.replace('http://', 'ws://') + '/ws';

    // Fallback (if someone misconfigured baseUrl)
    return `ws://${base.replace(/^\/+/, '')}/ws`;
  }
}
