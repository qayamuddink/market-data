import type { ExecuteTrade } from "../types/order";
import { unitsToAmount } from "../account/asset";
import { unitsToPrice } from "./precision";

export function formatTrade(trade: ExecuteTrade) {
    return {
        id: trade.id,
        symbol: trade.symbol,
        price: unitsToPrice(trade.price),
        quantity: unitsToAmount("BTC", trade.quantity),
        buyOrderId: trade.buyOrderId,
        sellOrderId: trade.sellOrderId,
        timestamp: trade.timestamp
    };
}