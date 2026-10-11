export type WebSocketChannel =
    | "trades"
    | "orderbook"
    | "ticker"
    | "orders";

export type Subscription = {
    channel: WebSocketChannel;
    symbol?: string;
    accountId?: string;
};

export type SubscribeMessage = {
    type: "subscribe";
    channel: WebSocketChannel;
    symbol?: string;
    accountId?: string;
};

export type UnsubscribeMessage = {
    type: "unsubscribe";
    channel: WebSocketChannel;
    symbol?: string;
    accountId?: string;
};

export type ClientMessage =
    | SubscribeMessage
    | UnsubscribeMessage;