import type { ManagedOrder } from "../exchange/order_manager";
import { unitsToPrice, unitsToQuantity } from "./precision";

export function formatOrder(managedOrder: ManagedOrder) {
    return {
        id: managedOrder.order.id,
        accountId: managedOrder.order.accountId,
        symbol: managedOrder.order.symbol,
        side: managedOrder.order.side,
        type: managedOrder.order.type,
        price: unitsToPrice(managedOrder.order.price),
        quantity: unitsToQuantity(managedOrder.order.quantity),
        status: managedOrder.status,
        originalQuantity: unitsToQuantity(
            managedOrder.originalQuantity
        ),
        filledQuantity: unitsToQuantity(
            managedOrder.filledQuantity
        )
    };
}