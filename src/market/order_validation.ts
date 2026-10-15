
import type { Order } from "../types/order";

export function validateOrder(order: Order): string | null {
    if (!order.id?.trim()) {
        return "Order ID is required";
    }

    if (!order.accountId?.trim()) {
        return "Account ID is required";
    }

    if (!order.symbol?.trim()) {
        return "Symbol is required";
    }

    if (order.type !== "LIMIT" && order.type !== "MARKET") {
        return "Invalid order type";
    }

    if (order.side !== "BUY" && order.side !== "SELL") {
        return "Invalid order side";
    }

    if (!Number.isSafeInteger(order.quantity) || order.quantity <= 0) {
        return "Quantity must be a positive safe integer";
    }

    if (order.type === "LIMIT") {
        if (!Number.isSafeInteger(order.price) || order.price <= 0) {
            return "Limit price must be a positive safe integer";
        }
    }

    if (order.type === "MARKET" && order.side === "BUY") {
        if (
            order.maxQuoteAmount === undefined ||
            !Number.isFinite(order.maxQuoteAmount) ||
            order.maxQuoteAmount <= 0
        ) {
            return "Market BUY requires a positive maxQuoteAmount";
        }
    }

    if (!Number.isFinite(order.timestamp) || order.timestamp < 0) {
        return "Invalid order timestamp";
    }

    return null;
}
