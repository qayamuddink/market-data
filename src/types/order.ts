export type OrderSide = "BUY" | "SELL";
export type orderType = "LIMIT" |  "MARKET";

export type Order = {
    id : string;
    symbol : string;
    side: OrderSide;
    type: orderType;
    price: number;
    quantity: number;
    timestamp : number;
}

export type PriceLevel = {
    price: number;
    orders: Order[]
}


export type OrderBook = {
    bids : Map<number, PriceLevel>;
    asks : Map<number, PriceLevel>;
}


export type ExecuteTrade = {
    id : string;
    symbol : string;
    price: number;
    quantity: number;
    buyOrderId : string;
    sellOrderId: string;
    timestamp: number;
}