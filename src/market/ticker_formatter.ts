import { symbol } from "zod";
import { unitsToPrice } from "./precision";

export function formatTicker(ticker: {
    symbol: string;
    lastPrice: number;
    bestBid?: number;
    bestAsk?: number;
}) {
    return {
        symbol: ticker.symbol,
        lastPrice: unitsToPrice(ticker.lastPrice),
        bestBid: ticker.bestBid !== undefined ? unitsToPrice(ticker.bestBid) : undefined,
        bestAsk: ticker.bestAsk !== undefined ? unitsToPrice(ticker.bestAsk) : undefined
    }
}