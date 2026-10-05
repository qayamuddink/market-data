import { OrderBook } from "./order-book";
import { createOrder } from "./order-factory";
import { FormatOrderResult } from "./order_result_formatter";
import { validateOrder } from "./order_validation";
import {
    priceToUnits,
    quantityToUnits,
    unitsToPrice,
    unitsToQuantity
} from "./precision";
import { formatTrade } from "./trade_formatter";


// ============================================================
// TEST 1: LIMIT ORDER MATCHING
// ============================================================

console.log("\n===== TEST 1: LIMIT ORDER MATCHING =====");

const orderBook = new OrderBook();

const order1 = createOrder(
    "order-1",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    84000,
    0.01,
    Date.now()
);

const order2 = createOrder(
    "order-2",
    "user-2",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    84000,
    0.02,
    Date.now()
);

const order3 = createOrder(
    "order-3",
    "user-3",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    85000,
    0.03,
    Date.now()
);

const order5 = createOrder(
    "order-5",
    "user-5",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    85100,
    0.03,
    Date.now()
);

orderBook.addOrder(order1);
orderBook.addOrder(order2);
orderBook.addOrder(order3);
orderBook.addOrder(order5);

console.log("Initial Order Book:");
console.dir(orderBook.getBook(), { depth: null });

console.log("Best Bid:");
console.dir(orderBook.getBestBid(), { depth: null });

console.log("Best Ask:");
console.dir(orderBook.getBestAsk(), { depth: null });


const buyOrder = createOrder(
    "order-4",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85100,
    0.05,
    Date.now()
);

const result = orderBook.placeOrder(buyOrder);

console.log("Executed Trades:");
console.dir(result, { depth: null });

console.log("Order Book After Matching:");
console.dir(orderBook.getBook(), { depth: null });


console.log("Formatted Trades:");

for (const trade of result.trades) {
    console.dir(formatTrade(trade), { depth: null });
}




// ============================================================
// TEST 2: ORDER VALIDATION
// ============================================================

console.log("\n===== TEST 2: ORDER VALIDATION =====");

const validOrder = createOrder(
    "order-valid",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    84000,
    0.01,
    Date.now()
);

console.log("Valid Order:", validateOrder(validOrder));


const invalidOrder = createOrder(
    "order-invalid",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    -84000,
    0,
    Date.now()
);

console.log("Invalid Order:", validateOrder(invalidOrder));

const invalidResult = orderBook.placeOrder(invalidOrder);

console.log("Invalid Order Trades:");
console.dir(invalidResult, { depth: null });


const marketOrder = createOrder(
    "order-6",
    "user-1",
    "BTCUSDT",
    "BUY",
    "MARKET",
    0,
    0.01,
    Date.now()
);

console.log(
    "Market Order Validation:",
    validateOrder(marketOrder)
);


// ============================================================
// TEST 3: ORDER CANCELLATION
// ============================================================

console.log("\n===== TEST 3: ORDER CANCELLATION =====");

const cancelResult = orderBook.cancelOrder("order-2");

console.log("Cancelled BUY:");
console.dir(cancelResult, { depth: null });


const cancelSellOrder = createOrder(
    "order-10",
    "user-2",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    86000,
    0.05,
    Date.now()
);

orderBook.addOrder(cancelSellOrder);

const cancelSellResult = orderBook.cancelOrder("order-10");

console.log("Cancelled SELL:");
console.dir(cancelSellResult, { depth: null });


const cancelNonExisting = orderBook.cancelOrder("order-999");

console.log("Cancel Non Existing:");
console.dir(cancelNonExisting, { depth: null });

console.log("Order Book After Cancellation:");
console.dir(orderBook.getBook(), { depth: null });


// ============================================================
// TEST 4: MARKET BUY
// ============================================================

console.log("\n===== TEST 4: MARKET BUY =====");

const marketBuyBook = new OrderBook();

const sellOrder20 = createOrder(
    "order-20",
    "user-2",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    85000,
    0.03,
    Date.now()
);

const sellOrder21 = createOrder(
    "order-21",
    "user-2",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    85100,
    0.03,
    Date.now()
);

marketBuyBook.addOrder(sellOrder20);
marketBuyBook.addOrder(sellOrder21);


const marketBuy = createOrder(
    "order-22",
    "user-1",
    "BTCUSDT",
    "BUY",
    "MARKET",
    0,
    0.05,
    Date.now()
);

const marketBuyResult = marketBuyBook.placeOrder(marketBuy);

console.log("Market Buy Trades:");
console.dir(marketBuyResult, { depth: null });

console.log("Order Book After Market BUY:");
console.dir(marketBuyBook.getBook(), { depth: null });


// ============================================================
// TEST 5: MARKET SELL
// ============================================================

console.log("\n===== TEST 5: MARKET SELL =====");

const marketSellBook = new OrderBook();

const buyOrder30 = createOrder(
    "order-30",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    84000,
    0.03,
    Date.now()
);

const buyOrder31 = createOrder(
    "order-31",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    83900,
    0.03,
    Date.now()
);

marketSellBook.addOrder(buyOrder30);
marketSellBook.addOrder(buyOrder31);


const marketSell = createOrder(
    "order-32",
    "user-2",
    "BTCUSDT",
    "SELL",
    "MARKET",
    0,
    0.04,
    Date.now()
);

const marketSellResult = marketSellBook.placeOrder(marketSell);

console.log("Market Sell Trades:");
console.dir(marketSellResult, { depth: null });

console.log("Order Book After Market SELL:");
console.dir(marketSellBook.getBook(), { depth: null });


// ============================================================
// TEST 6: OPEN ORDER
// ============================================================

console.log("\n===== TEST 6: OPEN ORDER =====");

const openOrderBook = new OrderBook();

const openOrder = createOrder(
    "order-40",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    80000,
    0.05,
    Date.now()
);

const openResult = openOrderBook.placeOrder(openOrder);

console.log("Open Order Result:");
console.dir(openResult, { depth: null });

console.log("Order Book:");
console.dir(openOrderBook.getBook(), { depth: null });


// ============================================================
// TEST 7: PARTIALLY FILLED
// ============================================================

console.log("\n===== TEST 7: PARTIALLY FILLED =====");

const partialBook = new OrderBook();

const partialSellOrder = createOrder(
    "order-41-sell",
    "user-2",
    "BTCUSDT",
    "SELL",
    "LIMIT",
    84000,
    0.03,
    Date.now()
);

partialBook.addOrder(partialSellOrder);


const partialBuyOrder = createOrder(
    "order-41",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    84000,
    0.05,
    Date.now()
);

const partialResult = partialBook.placeOrder(partialBuyOrder);

console.log("Partial Order Result:");
console.dir(partialResult, { depth: null });

console.log("Order Book After Partial Fill:");
console.dir(partialBook.getBook(), { depth: null });


console.log("Formatted Partial Order Result:");
console.dir(FormatOrderResult(partialResult), { depth: null });


// ============================================================
// TEST 8: CANCEL PARTIALLY FILLED ORDER
// ============================================================

console.log("\n===== TEST 8: CANCEL PARTIALLY FILLED ORDER =====");

const cancelPartialResult = partialBook.cancelOrder("order-41");

console.log("Cancel Partial Order Result:");
console.dir(cancelPartialResult, { depth: null });

console.log("Order Book After Cancelling Partial Order:");
console.dir(partialBook.getBook(), { depth: null });


// ============================================================
// TEST 9: PRECISION
// ============================================================

console.log("\n===== TEST 9: PRECISION =====");

const quantity = 0.03;
const price = 85000.25;

const quantityUnits = quantityToUnits(quantity);
const priceUnits = priceToUnits(price);

console.log("Quantity:");
console.log(quantity);

console.log("Quantity Units:");
console.log(quantityUnits);

console.log("Quantity Back:");
console.log(unitsToQuantity(quantityUnits));

console.log("Price:");
console.log(price);

console.log("Price Units:");
console.log(priceUnits);

console.log("Price Back:");
console.log(unitsToPrice(priceUnits));


// ============================================================
// TEST 10: ORDER FACTORY
// ============================================================

console.log("\n===== TEST 10: ORDER FACTORY =====");

const factoryOrder = createOrder(
    "order-50",
    "user-1",
    "BTCUSDT",
    "BUY",
    "LIMIT",
    85000.25,
    0.03,
    Date.now()
);

console.log("Factory Order:");
console.dir(factoryOrder, { depth: null });