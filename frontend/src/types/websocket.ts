import type { RawOrderBook } from './market';
import type { Trade } from './order';

export type WebSocketChannel = 'trades' | 'orderbook' | 'ticker' | 'orders';

export interface ClientSubscribeMessage {
  type: 'subscribe';
  channel: WebSocketChannel;
  symbol?: string;
  accountId?: string;
}

export interface ClientUnsubscribeMessage {
  type: 'unsubscribe';
  channel: WebSocketChannel;
  symbol?: string;
  accountId?: string;
}

export type ClientMessage = ClientSubscribeMessage | ClientUnsubscribeMessage;

export interface ServerSubscribedMessage {
  type: 'subscribed';
  channel: WebSocketChannel;
  symbol?: string;
  accountId?: string;
}

export interface ServerUnsubscribedMessage {
  type: 'unsubscribed';
  channel: WebSocketChannel;
  symbol?: string;
  accountId?: string;
}

export interface ServerOrderBookMessage {
  type: 'orderbook';
  symbol: string;
  orderBook: RawOrderBook;
}

export interface ServerTradeMessage {
  type: 'trade';
  trade: Trade;
}

export interface ServerTickerMessage {
  type: 'ticker';
  symbol: string;
  lastPrice: number;
  bestBid?: number;
  bestAsk?: number;
}

export interface ServerOrderUpdatedMessage {
  type: 'order';
  order: {
    id: string;
    accountId: string;
    symbol: string;
    status: string;
    originalQuantity: number;
    filledQuantity: number;
    quoteSpent: number;
  };
}

export type ServerMessage =
  | ServerSubscribedMessage
  | ServerUnsubscribedMessage
  | ServerOrderBookMessage
  | ServerTradeMessage
  | ServerTickerMessage
  | ServerOrderUpdatedMessage;
