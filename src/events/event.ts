import type { ExecuteTrade, OrderBook } from "../types/order";

export type TradeExecutedEvent = {
    type: "TradeExecuted";
    trade: ExecuteTrade;
};

export type OrderBookUpdatedEvent = {
    type: "OrderBookUpdated";
    symbol: string;
    orderBook: OrderBook;
};

export type OrderUpdatedEvent = {
    type: "OrderUpdated";
    order: {
        id: string;
        accountId: string;
        symbol: string;
        status: string;
        originalQuantity: number;
        filledQuantity: number;
        quoteSpent: number;
    };
};

export type TickerUpdateEvent = {
    type: "TickerUpdated";
    symbol: string;
    lastPrice: number;
    bestBid?: number;
    bestAsk?: number;
};

export type ExchangeEvent =
    | TradeExecutedEvent
    | OrderBookUpdatedEvent
    | TickerUpdateEvent
    | OrderUpdatedEvent;
