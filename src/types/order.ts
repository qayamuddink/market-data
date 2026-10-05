export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" |  "MARKET";

export type Order = {
    id : string;
    accountId: string;
    symbol : string;
    side: OrderSide;
    type: OrderType;
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
    buyAccountId: string;
    sellAccountId: string;
    timestamp: number;
}


export type MatchResult = {
    trades : ExecuteTrade[];
    remainingQuantity: number
}



export type OrderStatus = "OPEN" |  "PARTIALLY_FILLED" | "FILLED" | "CANCELLED"  | "REJECTED"

export type OrderResult = {
    status: OrderStatus;
    trades: ExecuteTrade[];
    remainingQuantity: number;
}


export type CancelResult  = {
    success : boolean;
    orderId: string;
    accountId?: string;
    side?: OrderSide;
    price?: number;
    remainingQuantity: number;
}