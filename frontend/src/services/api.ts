import { config } from '../config';
import type { RawOrderBook, TickerData } from '../types/market';
import type { Trade, ManagedOrder, Order, OrderResult, CancelResult } from '../types/order';
import type { AccountData, Asset } from '../types/account';

const BASE_URL = config.apiUrl;

/**
 * Custom API Error class containing server error details
 */
export class ApiError extends Error {
  public status: number;
  public details?: { field: string; message: string }[];

  constructor(message: string, status: number, details?: { field: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    let details: { field: string; message: string }[] | undefined;

    if (isJson && data) {
      if (typeof data.error === 'string') {
        errorMsg = data.error;
      }
      if (Array.isArray(data.details)) {
        const detailsList = data.details as { field: string; message: string }[];
        details = detailsList;
        const detailMsgs = detailsList.map((d) => `${d.field}: ${d.message}`).join(', ');
        errorMsg = `${errorMsg} (${detailMsgs})`;
      }
    }

    throw new ApiError(errorMsg, response.status, details);
  }

  return data as T;
}

export const api = {
  // Accounts
  async getAccount(accountId: string): Promise<AccountData | null> {
    try {
      return await request<AccountData>(`/accounts/${encodeURIComponent(accountId)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async createAccount(accountId: string): Promise<{ id: string }> {
    return await request<{ id: string }>('/accounts', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  },

  async deposit(accountId: string, asset: Asset, amount: number): Promise<{ accountId: string; asset: string; amount: number }> {
    return await request<{ accountId: string; asset: string; amount: number }>(
      `/accounts/${encodeURIComponent(accountId)}/deposit`,
      {
        method: 'POST',
        body: JSON.stringify({ asset, amount }),
      }
    );
  },

  // Market & Order Book
  async getOrderBook(): Promise<RawOrderBook> {
    return await request<RawOrderBook>('/orderbook');
  },

  async getTrades(symbol: string): Promise<Trade[]> {
    return await request<Trade[]>(`/trades?symbol=${encodeURIComponent(symbol)}`);
  },

  async getTicker(symbol: string): Promise<TickerData> {
    return await request<TickerData>(`/ticker?symbol=${encodeURIComponent(symbol)}`);
  },

  // Orders
  async getOrders(): Promise<ManagedOrder[]> {
    return await request<ManagedOrder[]>('/orders');
  },

  async getOrder(orderId: string): Promise<ManagedOrder | null> {
    try {
      return await request<ManagedOrder>(`/orders/${encodeURIComponent(orderId)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async placeOrder(order: Order): Promise<OrderResult> {
    return await request<OrderResult>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        id: order.id,
        accountId: order.accountId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        price: order.price,
        quantity: order.quantity,
        ...(order.maxQuoteAmount !== undefined ? { maxQuoteAmount: order.maxQuoteAmount } : {}),
      }),
    });
  },

  async cancelOrder(orderId: string): Promise<CancelResult> {
    return await request<CancelResult>(`/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
  },
};
