import { useEffect, useState } from 'react';
import { wsClient, type ConnectionStatus } from '../services/websocket';
import type {
  ServerOrderBookMessage,
  ServerTradeMessage,
  ServerTickerMessage,
  ServerOrderUpdatedMessage,
} from '../types/websocket';

interface UseWebSocketOptions {
  symbol: string;
  accountId: string;
  enabled?: boolean;
  onOrderBook?: (data: ServerOrderBookMessage) => void;
  onTrade?: (data: ServerTradeMessage) => void;
  onTicker?: (data: ServerTickerMessage) => void;
  onOrderUpdated?: (data: ServerOrderUpdatedMessage) => void;
}

export function useWebSocket({
  symbol,
  accountId,
  enabled = true,
  onOrderBook,
  onTrade,
  onTicker,
  onOrderUpdated,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>(wsClient.getStatus());

  useEffect(() => {
    if (!enabled) return;

    // Connect socket if not connected
    wsClient.connect();

    // Listen for status changes
    const unsubStatus = wsClient.onStatus((s) => setStatus(s));

    // Listen for events
    const unsubBook = onOrderBook ? wsClient.onOrderBook(onOrderBook) : undefined;
    const unsubTrade = onTrade ? wsClient.onTrade(onTrade) : undefined;
    const unsubTicker = onTicker ? wsClient.onTicker(onTicker) : undefined;
    const unsubOrder = onOrderUpdated ? wsClient.onOrderUpdated(onOrderUpdated) : undefined;

    // Register active subscriptions
    wsClient.subscribe('orderbook', symbol);
    wsClient.subscribe('trades', symbol);
    wsClient.subscribe('ticker', symbol);
    if (accountId) {
      wsClient.subscribe('orders', undefined, accountId);
    }

    return () => {
      unsubStatus();
      unsubBook?.();
      unsubTrade?.();
      unsubTicker?.();
      unsubOrder?.();

      wsClient.unsubscribe('orderbook', symbol);
      wsClient.unsubscribe('trades', symbol);
      wsClient.unsubscribe('ticker', symbol);
      if (accountId) {
        wsClient.unsubscribe('orders', undefined, accountId);
      }
    };
  }, [symbol, accountId, enabled, onOrderBook, onTrade, onTicker, onOrderUpdated]);

  return {
    status,
    isConnected: status === 'CONNECTED',
    reconnect: () => {
      wsClient.disconnect();
      wsClient.connect();
    },
  };
}
