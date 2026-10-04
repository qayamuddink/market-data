import type { MarketPrice } from "../types/market";


let latestPrice : MarketPrice = {
    symbol : "BTCUSDT",
    price: 0,
    timestamp:0
}

export function updatePrice(price: MarketPrice): void {
    latestPrice = price
}

export function getLatestPrice() : MarketPrice {
    return latestPrice;
}