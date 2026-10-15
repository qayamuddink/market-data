import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useWebSocket } from './useWebSocket';
import type { RawOrderBook, TickerData } from '../types/market';
import type { Trade, ManagedOrder, Order } from '../types/order';
import type { AccountData, Asset } from '../types/account';
import type {
  ServerOrderBookMessage,
  ServerTradeMessage,
  ServerTickerMessage,
  ServerOrderUpdatedMessage,
} from '../types/websocket';

interface UseTradingApiOptions {
  symbol: string;
  accountId: string;
  pollInterval?: number; // fallback polling interval in ms
}

export function useTradingApi({ symbol, accountId, pollInterval = 10000 }: UseTradingApiOptions) {
  const [orderBook, setOrderBook] = useState<RawOrderBook>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [ticker, setTicker] = useState<TickerData>({
    symbol,
    lastPrice: 0,
    bestBid: undefined,
    bestAsk: undefined,
  });
  const [accountData, setAccountData] = useState<AccountData | null>(null);

  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(true);
  const [isLoadingAccount, setIsLoadingAccount] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const prevPriceRef = useRef<number | undefined>(undefined);

  // Fetch Market Data (OrderBook, Ticker, Trades) via REST for initial snapshot
  const fetchMarketData = useCallback(async () => {
    try {
      const [bookRes, tickerRes, tradesRes] = await Promise.all([
        api.getOrderBook(),
        api.getTicker(symbol),
        api.getTrades(symbol),
      ]);

      setOrderBook(bookRes);

      setTicker((prev) => {
        if (tickerRes.lastPrice && tickerRes.lastPrice !== prev.lastPrice) {
          prevPriceRef.current = prev.lastPrice;
        }
        return tickerRes;
      });

      setTrades(tradesRes);
      setApiError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch market data';
      console.warn('Market REST fetch error:', msg);
    } finally {
      setIsLoadingMarket(false);
    }
  }, [symbol]);

  // Fetch Account & Open Orders Data
  const fetchAccountData = useCallback(async () => {
    if (!accountId) return;
    try {
      const [accRes, ordersRes] = await Promise.all([
        api.getAccount(accountId),
        api.getOrders(),
      ]);

      setAccountData(accRes);
      setOrders(ordersRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch account';
      console.warn('Account REST fetch error:', msg);
    } finally {
      setIsLoadingAccount(false);
    }
  }, [accountId]);

  // Initial Snapshot Loading
  useEffect(() => {
    setIsLoadingMarket(true);
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    setIsLoadingAccount(true);
    fetchAccountData();
  }, [fetchAccountData]);

  // WebSocket Live Event Handlers
  const handleWsOrderBook = useCallback((msg: ServerOrderBookMessage) => {
    if (msg.orderBook) {
      setOrderBook(msg.orderBook);
      setIsLoadingMarket(false);
    }
  }, []);

  const handleWsTrade = useCallback((msg: ServerTradeMessage) => {
    if (msg.trade) {
      setTrades((prev) => {
        // Prepend new trade if not already in list
        if (prev.some((t) => t.id === msg.trade.id)) return prev;
        return [msg.trade, ...prev];
      });

      setTicker((prev) => {
        if (msg.trade.price !== prev.lastPrice) {
          prevPriceRef.current = prev.lastPrice;
        }
        return {
          ...prev,
          lastPrice: msg.trade.price,
        };
      });
    }
  }, []);

  const handleWsTicker = useCallback((msg: ServerTickerMessage) => {
    setTicker((prev) => {
      if (msg.lastPrice && msg.lastPrice !== prev.lastPrice) {
        prevPriceRef.current = prev.lastPrice;
      }
      return {
        symbol: msg.symbol,
        lastPrice: msg.lastPrice,
        bestBid: msg.bestBid ?? prev.bestBid,
        bestAsk: msg.bestAsk ?? prev.bestAsk,
      };
    });
  }, []);

  const handleWsOrderUpdated = useCallback(
    (msg: ServerOrderUpdatedMessage) => {
      const updated = msg.order;
      if (!updated) return;

      // Update in orders list
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            status: updated.status as ManagedOrder['status'],
            originalQuantity: updated.originalQuantity,
            filledQuantity: updated.filledQuantity,
          };
          return next;
        }
        return prev;
      });

      // Refresh balances since an order update implies reservation release or fill
      fetchAccountData();
    },
    [fetchAccountData]
  );

  // Hook into WebSocket client
  const { status: wsStatus, isConnected: wsConnected } = useWebSocket({
    symbol,
    accountId,
    enabled: true,
    onOrderBook: handleWsOrderBook,
    onTrade: handleWsTrade,
    onTicker: handleWsTicker,
    onOrderUpdated: handleWsOrderUpdated,
  });

  // Fallback Polling (only active if polling is enabled and as backup heartbeat)
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;

    // If WS is connected, poll slower as safety heartbeat
    const effectiveInterval = wsConnected ? Math.max(pollInterval, 20000) : pollInterval;

    const interval = setInterval(() => {
      fetchMarketData();
      fetchAccountData();
    }, effectiveInterval);

    return () => clearInterval(interval);
  }, [fetchMarketData, fetchAccountData, pollInterval, wsConnected]);

  // Place Order Action
  const submitOrder = useCallback(
    async (order: Order): Promise<{ success: boolean; error?: string }> => {
      try {
        await api.placeOrder(order);
        // Reconcile via REST immediately
        await Promise.all([fetchMarketData(), fetchAccountData()]);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Order submission failed';
        return { success: false, error: msg };
      }
    },
    [fetchMarketData, fetchAccountData]
  );

  // Cancel Order Action
  const cancelOrder = useCallback(
    async (orderId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await api.cancelOrder(orderId);
        await Promise.all([fetchMarketData(), fetchAccountData()]);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Order cancellation failed';
        return { success: false, error: msg };
      }
    },
    [fetchMarketData, fetchAccountData]
  );

  // Deposit Funds Action
  const deposit = useCallback(
    async (
      targetAccountId: string,
      asset: Asset,
      amount: number
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await api.deposit(targetAccountId, asset, amount);
        await fetchAccountData();
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Deposit failed';
        return { success: false, error: msg };
      }
    },
    [fetchAccountData]
  );

  // Create Account Action
  const createAccount = useCallback(
    async (newAccId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await api.createAccount(newAccId);
        await fetchAccountData();
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Account creation failed';
        return { success: false, error: msg };
      }
    },
    [fetchAccountData]
  );

  return {
    orderBook,
    trades,
    orders,
    ticker,
    prevPrice: prevPriceRef.current,
    accountData,
    isLoadingMarket,
    isLoadingAccount,
    apiError,
    wsConnected,
    wsStatus,
    submitOrder,
    cancelOrder,
    deposit,
    createAccount,
    refetchAll: useCallback(() => {
      return Promise.all([fetchMarketData(), fetchAccountData()]);
    }, [fetchMarketData, fetchAccountData]),
  };
}
