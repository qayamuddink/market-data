import type { OrderBook } from "../types/order";
import { unitsToPrice, unitsToQuantity } from "./precision";

export function formatOrderBook(orderBook: OrderBook) {
    return {
        bids: Array.from(orderBook.bids.values()).map(priceLevel => ({
            price: unitsToPrice(priceLevel.price),
            orders: priceLevel.orders.map(order => ({
                id: order.id,
                accountId: order.accountId,
                quantity: unitsToQuantity(order.quantity)
            }))
        })),

        asks: Array.from(orderBook.asks.values()).map(priceLevel => ({
            price: unitsToPrice(priceLevel.price),
            orders: priceLevel.orders.map(order => ({
                id: order.id,
                accountId: order.accountId,
                quantity: unitsToQuantity(order.quantity)
            }))
        }))
    };
}