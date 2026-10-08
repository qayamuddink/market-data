

export type WebSocketChannel = | "trades" | "orderbook" | "ticker"

export type Subscription = {
    channel: WebSocketChannel;
    symbol: string;
}

export type SubscribeMessage = {
    type: "subscribe";
    channel: WebSocketChannel;
    symbol: string
}


export type UnsubscribeMessage = {
    type: "unsubscribe";
    channel: WebSocketChannel;
    symbol: string;
};


export type ClientMessage = | SubscribeMessage | UnsubscribeMessage;
