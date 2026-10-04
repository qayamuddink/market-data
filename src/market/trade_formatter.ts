import type { ExecuteTrade } from "../types/order";
import { unitsToPrice, unitsToQuantity } from "./precision";

export type FormattedTrade = {
    id: string;
    symbol: string;
    price: number;
    quantity: number;
    buyOrderId: string;
    sellOrderId: string;
    timestamp: number;
};


export function formatTrade(trade: ExecuteTrade): FormattedTrade {
    return {
        id: trade.id,
        symbol: trade.symbol,
        price: unitsToPrice(trade.price),
        quantity: unitsToQuantity(trade.quantity),
        buyOrderId: trade.buyOrderId,
        sellOrderId: trade.sellOrderId,
        timestamp: trade.timestamp
    }
}