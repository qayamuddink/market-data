import { AccountManager } from "../account/account";
import { OrderReservation } from "./order_reservation";
import { createOrder } from "../market/order-factory";

const accountManager = new AccountManager();
const reservation = new OrderReservation(accountManager);

accountManager.createAccount("user-1");
accountManager.createAccount("user-2");

accountManager.addBalance(
    "user-1",
    "USDT",
    10000
);

accountManager.addBalance(
    "user-2",
    "BTC",
    1
);

console.log("===== INITIAL BALANCES =====");

console.log(
    "User 1:",
    accountManager.getAccount("user-1")
);

console.log(
    "User 2:",
    accountManager.getAccount("user-2")
);


// BUY ORDER

const buyOrder = createOrder(
    "order-1",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85000,
    0.03,
    Date.now()
);

reservation.reserve(buyOrder);

console.log("\n===== AFTER BUY RESERVATION =====");

console.log(
    "User 1:",
    accountManager.getAccount("user-1")
);


// SELL ORDER

const sellOrder = createOrder(
    "order-2",
    "user-2",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    85000,
    0.03,
    Date.now()
);

reservation.reserve(sellOrder);

console.log("\n===== AFTER SELL RESERVATION =====");

console.log(
    "User 2:",
    accountManager.getAccount("user-2")
);


console.log("\n===== TEST: INSUFFICIENT BALANCE =====");

accountManager.createAccount("user-3");

accountManager.addBalance(
    "user-3",
    "USDT",
    100
);

const expensiveOrder = createOrder(
    "order-3",
    "user-3",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85000,
    0.03,
    Date.now()
);

reservation.reserve(expensiveOrder);