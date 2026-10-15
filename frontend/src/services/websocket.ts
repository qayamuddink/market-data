import { config } from '../config';
import type {
  ClientSubscribeMessage,
  ServerMessage,
  ServerOrderBookMessage,
  ServerTradeMessage,
  ServerTickerMessage,
  ServerOrderUpdatedMessage,
  WebSocketChannel,
} from '../types/websocket';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

type OrderBookHandler = (data: ServerOrderBookMessage) => void;
type TradeHandler = (data: ServerTradeMessage) => void;
type TickerHandler = (data: ServerTickerMessage) => void;
type OrderUpdatedHandler = (data: ServerOrderUpdatedMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

interface SubscriptionKey {
  channel: WebSocketChannel;
  symbol?: string;
  accountId?: string;
}

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;

  // Active subscriptions to re-send on reconnect
  private subscriptions: Map<string, SubscriptionKey> = new Map();

  // Listeners
  private orderBookListeners: Set<OrderBookHandler> = new Set();
  private tradeListeners: Set<TradeHandler> = new Set();
  private tickerListeners: Set<TickerHandler> = new Set();
  private orderListeners: Set<OrderUpdatedHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();

  constructor(url: string = config.wsUrl) {
    this.url = url;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'CONNECTED';
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.updateStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('CONNECTED');
        this.resubscribeAll();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.isExplicitlyClosed) {
          this.updateStatus('DISCONNECTED');
          this.scheduleReconnect();
        } else {
          this.updateStatus('DISCONNECTED');
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        // onclose will trigger next and handle reconnection
      };
    } catch (err) {
      console.warn('WebSocket initialization failed:', err);
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('DISCONNECTED');
  }

  public subscribe(channel: WebSocketChannel, symbol?: string, accountId?: string): void {
    const key = this.createKey({ channel, symbol, accountId });
    this.subscriptions.set(key, { channel, symbol, accountId });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        channel,
        symbol,
        accountId,
      });
    }
  }

  public unsubscribe(channel: WebSocketChannel, symbol?: string, accountId?: string): void {
    const key = this.createKey({ channel, symbol, accountId });
    this.subscriptions.delete(key);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        channel,
        symbol,
        accountId,
      });
    }
  }

  private send(msg: ClientSubscribeMessage | { type: 'unsubscribe'; channel: WebSocketChannel; symbol?: string; accountId?: string }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private resubscribeAll(): void {
    for (const sub of this.subscriptions.values()) {
      this.send({
        type: 'subscribe',
        channel: sub.channel,
        symbol: sub.symbol,
        accountId: sub.accountId,
      });
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    try {
      const data = JSON.parse(raw) as ServerMessage;
      if (!data || !data.type) return;

      switch (data.type) {
        case 'orderbook':
          this.orderBookListeners.forEach((cb) => cb(data));
          break;
        case 'trade':
          this.tradeListeners.forEach((cb) => cb(data));
          break;
        case 'ticker':
          this.tickerListeners.forEach((cb) => cb(data));
          break;
        case 'order':
          this.orderListeners.forEach((cb) => cb(data));
          break;
        case 'subscribed':
        case 'unsubscribed':
          // Subscription acknowledgements
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('Failed to parse incoming WebSocket message:', err);
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    this.reconnectAttempts++;
    // Exponential backoff with jitter: Math.min(1000 * 2^attempts, max)
    const baseDelay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    const jitter = Math.random() * 500;
    const delay = Math.round(baseDelay + jitter);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, delay);
  }

  private updateStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((cb) => cb(newStatus));
    }
  }

  private createKey(sub: SubscriptionKey): string {
    if (sub.channel === 'orders') return `orders:${sub.accountId}`;
    return `${sub.channel}:${sub.symbol}`;
  }

  // Listener subscriptions
  public onOrderBook(handler: OrderBookHandler): () => void {
    this.orderBookListeners.add(handler);
    return () => this.orderBookListeners.delete(handler);
  }

  public onTrade(handler: TradeHandler): () => void {
    this.tradeListeners.add(handler);
    return () => this.tradeListeners.delete(handler);
  }

  public onTicker(handler: TickerHandler): () => void {
    this.tickerListeners.add(handler);
    return () => this.tickerListeners.delete(handler);
  }

  public onOrderUpdated(handler: OrderUpdatedHandler): () => void {
    this.orderListeners.add(handler);
    return () => this.orderListeners.delete(handler);
  }

  public onStatus(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => this.statusListeners.delete(handler);
  }
}

// Export singleton instance for app-wide sharing
export const wsClient = new WebSocketClient();
