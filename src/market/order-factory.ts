import type { Order, OrderSide, OrderType } from "../types/order";
import { priceToUnits, quantityToUnits } from "./precision";

export function createOrder(
    id: string,
    symbol: string,
    side: OrderSide,
    type: OrderType,
    price: number,
    quantity: number,
    timestamp: number
): Order {
    return {
        id,
        symbol,
        side,
        type,
        price: priceToUnits(price),
        quantity: quantityToUnits(quantity),
        timestamp
    };
}