import type { ExecuteTrade } from "../types/order"

export type TradeExecutedEvent = {
    type: "TradeExecuted";
    trade: ExecuteTrade;
}

export type ExchangeEvent = | TradeExecutedEvent;