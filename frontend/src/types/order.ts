export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type OrderStatus = 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
  maxQuoteAmount?: number;
  timestamp?: number;
}

export interface ManagedOrder {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
  status: OrderStatus;
  originalQuantity: number;
  filledQuantity: number;
}

export interface OrderResult {
  status: OrderStatus;
  trades: Trade[];
  remainingQuantity: number;
}

export interface CancelResult {
  success: boolean;
  orderId: string;
  accountId?: string;
  side?: OrderSide;
  price?: number;
  remainingQuantity?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  buyOrderId: string;
  sellOrderId: string;
  timestamp: number;
  side?: OrderSide; // derived or inferred if known
}
