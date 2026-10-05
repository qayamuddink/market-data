import { OrderManager } from "./order_manager";
import { createOrder } from "../market/order-factory";

const orderManager = new OrderManager();

const order = createOrder(
    "order-1",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85000,
    0.05,
    Date.now()
);

console.log("===== ADD ORDER =====");

orderManager.addOrder(order);

console.log(
    orderManager.getOrder("order-1")
);

console.log("\n===== UPDATE FILLED QUANTITY =====");

orderManager.updateFilledQuantity(
    "order-1",
    3000000
);

console.log(
    orderManager.getOrder("order-1")
);

console.log("\n===== UPDATE STATUS =====");

orderManager.updateOrderStatus(
    "order-1",
    "PARTIALLY_FILLED"
);

console.log(
    orderManager.getOrder("order-1")
);

console.log("\n===== ALL ORDERS =====");

console.log(
    orderManager.getOrders()
);


console.log("\n===== PROCESS TRADE =====");

orderManager.processTrades(
    "order-1",
    2000000
);

console.log(
    orderManager.getOrder("order-1")
);