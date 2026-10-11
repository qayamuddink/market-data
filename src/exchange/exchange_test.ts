import { Exchange } from "./exchange";
import { createOrder } from "../market/order-factory";
import { EventBus } from "../events/event_bus";


const eventBus = new EventBus();
const exchange = new Exchange(eventBus);


// ===============================
// CREATE ACCOUNTS
// ===============================

exchange.createAccount("user-1");
exchange.createAccount("user-2");


// ===============================
// ADD BALANCES
// ===============================

exchange.addBalance(
    "user-1",
    "USDT",
    10000
);

exchange.addBalance(
    "user-2",
    "BTC",
    1
);


// ===============================
// BUY ORDER
// ===============================

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

const buyResult = exchange.placeOrder(buyOrder);

console.log("===== BUY RESULT =====");
console.log(buyResult);


// ===============================
// SELL ORDER
// ===============================

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

const sellResult = exchange.placeOrder(sellOrder);

console.log("\n===== SELL RESULT =====");
console.log(sellResult);


// ===============================
// ACCOUNTS
// ===============================

console.log("\n===== USER 1 =====");

console.log(
    exchange.getAccount("user-1")
);

console.log("\n===== USER 2 =====");

console.log(
    exchange.getAccount("user-2")
);


// ===============================
// ORDER BOOK
// ===============================

console.log("\n===== ORDER BOOK =====");

console.log(
    exchange.getOrderBook()
);



console.log("\n===== TEST: CANCEL ORDER =====");

exchange.createAccount("user-3");

exchange.addBalance(
    "user-3",
    "USDT",
    10000
);

const cancelOrder = createOrder(
    "order-3",
    "user-3",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85000,
    0.03,
    Date.now()
);

const cancelPlaceResult = exchange.placeOrder(
    cancelOrder
);

console.log("Placed Order:");
console.log(cancelPlaceResult);

console.log("\nBefore Cancellation:");
console.log(
    exchange.getAccount("user-3")
);

const cancelResult = exchange.cancelOrder(
    "order-3"
);

console.log("\nCancel Result:");
console.log(cancelResult);

console.log("\nAfter Cancellation:");
console.log(
    exchange.getAccount("user-3")
);



console.log("\n===== TEST: PARTIAL FILL + CANCEL =====");

exchange.createAccount("user-4");
exchange.createAccount("user-5");

exchange.addBalance(
    "user-4",
    "USDT",
    10000
);

exchange.addBalance(
    "user-5",
    "BTC",
    1
);

// BUY 0.05 BTC
const partialBuyOrder = createOrder(
    "order-4",
    "user-4",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85000,
    0.05,
    Date.now()
);

const partialBuyResult = exchange.placeOrder(
    partialBuyOrder
);

console.log("\nBUY RESULT:");
console.log(partialBuyResult);

console.log("\nUSER-4 BEFORE SELL:");
console.log(
    exchange.getAccount("user-4")
);

// SELL only 0.03 BTC
const partialSellOrder = createOrder(
    "order-5",
    "user-5",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    85000,
    0.03,
    Date.now()
);

const partialsellResult = exchange.placeOrder(
    partialSellOrder
);

console.log("\nSELL RESULT:");
console.log(partialsellResult);

console.log("\nUSER-4 AFTER PARTIAL FILL:");
console.log(
    exchange.getAccount("user-4")
);

console.log("\nCANCEL REMAINING BUY:");

const partialCancelResult = exchange.cancelOrder(
    "order-4"
);

console.log(partialCancelResult);

console.log("\nUSER-4 AFTER CANCELLATION:");
console.log(
    exchange.getAccount("user-4")
);

console.log("\nORDER BOOK AFTER CANCELLATION:");
console.log(
    exchange.getOrderBook()
);

console.log("\n===== TEST: BETTER PRICE EXECUTION =====");

exchange.createAccount("user-6");
exchange.createAccount("user-7");

exchange.addBalance(
    "user-6",
    "USDT",
    10000
);

exchange.addBalance(
    "user-7",
    "BTC",
    1
);

// SELL first at $84,000
const betterPriceSellOrder = createOrder(
    "order-7",
    "user-7",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    84000,
    0.03,
    Date.now()
);

const betterPriceSellResult = exchange.placeOrder(
    betterPriceSellOrder
);

console.log("\nSELL RESULT:");
console.log(betterPriceSellResult);

console.log("\nUSER-7 AFTER SELL:");
console.log(
    exchange.getAccount("user-7")
);

// BUY 0.05 BTC at $85,000
const betterPriceBuyOrder = createOrder(
    "order-6",
    "user-6",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85000,
    0.05,
    Date.now()
);

const betterPriceBuyResult = exchange.placeOrder(
    betterPriceBuyOrder
);

console.log("\nBUY RESULT:");
console.log(betterPriceBuyResult);

console.log("\nUSER-6 AFTER BETTER PRICE TRADE:");
console.log(
    exchange.getAccount("user-6")
);



console.log("\n===== ORDER MANAGER =====");

console.log(
    exchange.getOrder("order-6")
);

console.log(
    exchange.getOrder("order-7")
);



console.log("\n===== CANCELLED ORDER STATUS =====");

console.log(
    exchange.getOrder("order-3")
);



console.log("\n===== PARTIAL ORDER CANCELLED STATUS =====");

console.log(
    exchange.getOrder("order-4")
);
