import type { ExecuteTrade } from "../types/order";

export class MarketData {
    private trades: Map<string, ExecuteTrade[]> = new Map();
    private lastPrices: Map<string, number> = new Map();

    addTrade(trade: ExecuteTrade): void {
        const symbolTrades =
            this.trades.get(trade.symbol) ?? [];

        symbolTrades.push(trade);

        this.trades.set(
            trade.symbol,
            symbolTrades
        );

        this.lastPrices.set(
            trade.symbol,
            trade.price
        );
    }

    getTrades(symbol: string): ExecuteTrade[] {
        return this.trades.get(symbol) ?? [];
    }

    getLastPrice(symbol: string): number | undefined {
        return this.lastPrices.get(symbol);
    }
}