import type { Order, OrderStatus } from "../types/order";

export type ManagedOrder = {
    order: Order;
    status: OrderStatus;
    originalQuantity: number;
    filledQuantity: number;
    quoteSpent: number;
};

export class OrderManager {
    private orders: Map<string, ManagedOrder> = new Map();

    addOrder(order: Order): void {
        if (this.orders.has(order.id)) {
            throw new Error("Order already exists");
        }

        this.orders.set(order.id, {
            order,
            status: "OPEN",
            originalQuantity: order.quantity,
            filledQuantity: 0,
            quoteSpent: 0
        });
    }

    getOrder(orderId: string): ManagedOrder | undefined {
        return this.orders.get(orderId);
    }

    updateOrderStatus(
        orderId: string,
        status: OrderStatus
    ): void {
        const managedOrder = this.orders.get(orderId);

        if (!managedOrder) {
            throw new Error("Order not found");
        }

        managedOrder.status = status;
    }

    updateFilledQuantity(
        orderId: string,
        quantity: number
    ): void {
        const managedOrder = this.orders.get(orderId);

        if (!managedOrder) {
            throw new Error("Order not found");
        }

        managedOrder.filledQuantity += quantity;
    }

    getOrders(): ManagedOrder[] {
        return Array.from(this.orders.values());
    }

    processTrades(orderId: string , quantity: number): void{
        this.updateFilledQuantity(orderId, quantity)
        const managedOrder = this.orders.get(orderId)

        if(!managedOrder) {
            throw new Error("Order not found");
        }

        if ( managedOrder.filledQuantity === managedOrder.originalQuantity ){
            managedOrder.status = "FILLED"
        }else{
            managedOrder.status = "PARTIALLY_FILLED"
        }
    }


    cancelOrder(orderId: string): void {
        const managedOrder = this.orders.get(orderId);

        if(!managedOrder){
            throw new Error("Order not found");
        }

        managedOrder.status = "CANCELLED";
    }

    getOrderData(orderId: string) : Order | undefined {
        return this.orders.get(orderId)?.order
    }


    addQuoteSpent(orderId: string, amount: number): void {
    const managedOrder = this.orders.get(orderId);

    if (!managedOrder) {
        throw new Error("Order not found");
    }

    managedOrder.quoteSpent += amount;
}

    
}