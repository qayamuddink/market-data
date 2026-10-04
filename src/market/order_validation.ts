import type { Order } from "../types/order";

export function validateOrder(order: Order): string | null {
    if(!order.id) {
        return "Order ID is required";
    }
    if(!order.symbol){
        return "Symbol is required";
    }
    if( order.type === "LIMIT" && order.price <= 0 ){
        return "Price must be greater than 0";
    }
    if(order.quantity <= 0){
        return "Quantity must be grater than 0";
    }

    return null;
}