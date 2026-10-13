import { beforeEach, describe, expect, test } from "bun:test";
import { Exchange } from "../src/exchange/exchange";
import { createOrder } from "../src/market/order-factory";
import { EventBus } from "../src/events/event_bus";

let exchange: Exchange;

beforeEach(() => {
    const eventBus = new EventBus();
    exchange = new Exchange(eventBus);
})

describe("Exchange", () => {

    test("should create an account", () => {
       

        exchange.createAccount("alice");

        const account = exchange.getAccount("alice");

        expect(account).toBeDefined();
        expect(account?.id).toBe("alice");
    });

    test("should deposit USDT into an account", () => {
        

        exchange.createAccount("alice");

        exchange.addBalance(
            "alice",
            "USDT",
            10000
        );

        const account = exchange.getAccount("alice");

        expect(account).toBeDefined();

        const balance = account?.balances.get("USDT");

        expect(balance).toBeDefined();
        expect(balance?.available).toBe(1_000_000);
        expect(balance?.locked).toBe(0);
    });

    test("should create an open BUY order", () => {
       

        exchange.createAccount("alice");

        exchange.addBalance(
            "alice",
            "USDT",
            10000
        );

        const order = createOrder(
            "order-1",
            "alice",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        const result = exchange.placeOrder(order);

        expect(result.status).toBe("OPEN");
        expect(result.trades).toHaveLength(0);
        expect(result.remainingQuantity).toBe(1_000_000);

        const savedOrder = exchange.getOrder("order-1");

        expect(savedOrder).toBeDefined();
        expect(savedOrder?.status).toBe("OPEN");
        expect(savedOrder?.filledQuantity).toBe(0);
    });

    test("should lock balance when BUY order is created", () => {
        

        exchange.createAccount("alice");

        exchange.addBalance(
            "alice",
            "USDT",
            10000
        );

        const order = createOrder(
            "order-2",
            "alice",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        exchange.placeOrder(order);

        const account = exchange.getAccount("alice");

        const balance = account?.balances.get("USDT");

        expect(balance?.available).toBe(915_000);
        expect(balance?.locked).toBe(85_000);
    });

    test("should match BUY and SELL orders", () => {
       

        exchange.createAccount("alice");
        exchange.createAccount("bob");

        exchange.addBalance(
            "alice",
            "USDT",
            10000
        );

        exchange.addBalance(
            "bob",
            "BTC",
            0.01
        );

        const buyOrder = createOrder(
            "buy-1",
            "alice",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        const sellOrder = createOrder(
            "sell-1",
            "bob",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        const buyResult = exchange.placeOrder(buyOrder);

        expect(buyResult.status).toBe("OPEN");

        const sellResult = exchange.placeOrder(sellOrder);

        expect(sellResult.status).toBe("FILLED");
        expect(sellResult.trades).toHaveLength(1);
        expect(sellResult.remainingQuantity).toBe(0);

        const savedBuyOrder = exchange.getOrder("buy-1");
        const savedSellOrder = exchange.getOrder("sell-1");

        expect(savedBuyOrder?.status).toBe("FILLED");
        expect(savedBuyOrder?.filledQuantity).toBe(1_000_000);

        expect(savedSellOrder?.status).toBe("FILLED");
        expect(savedSellOrder?.filledQuantity).toBe(1_000_000);
    });

    test("should settle balances after a trade", () => {
       

        exchange.createAccount("alice");
        exchange.createAccount("bob");

        exchange.addBalance(
            "alice",
            "USDT",
            10000
        );

        exchange.addBalance(
            "bob",
            "BTC",
            0.01
        );

        const buyOrder = createOrder(
            "buy-2",
            "alice",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        const sellOrder = createOrder(
            "sell-2",
            "bob",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        exchange.placeOrder(buyOrder);
        exchange.placeOrder(sellOrder);

        const alice = exchange.getAccount("alice");
        const bob = exchange.getAccount("bob");

        const aliceUSDT = alice?.balances.get("USDT");
        const aliceBTC = alice?.balances.get("BTC");

        const bobUSDT = bob?.balances.get("USDT");
        const bobBTC = bob?.balances.get("BTC");

        expect(aliceUSDT?.available).toBe(915_000);
        expect(aliceUSDT?.locked).toBe(0);

        expect(aliceBTC?.available).toBe(1_000_000);

        expect(bobBTC?.available).toBe(0);
        expect(bobBTC?.locked).toBe(0);

        expect(bobUSDT?.available).toBe(85_000);
    });

    test("should cancel an open BUY order and release balance", () => {
        

        exchange.createAccount("alice");

        exchange.addBalance(
            "alice",
            "USDT",
            10000
        );

        const order = createOrder(
            "cancel-order-1",
            "alice",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        const result = exchange.placeOrder(order);

        expect(result.status).toBe("OPEN");

        const beforeCancel = exchange.getAccount("alice");
        const beforeBalance = beforeCancel?.balances.get("USDT");

        expect(beforeBalance?.available).toBe(915_000);
        expect(beforeBalance?.locked).toBe(85_000);

        const cancelResult = exchange.cancelOrder(
            "cancel-order-1"
        );

        expect(cancelResult.success).toBe(true);
        expect(cancelResult.orderId).toBe("cancel-order-1");

        const afterCancel = exchange.getAccount("alice");
        const afterBalance = afterCancel?.balances.get("USDT");

        expect(afterBalance?.available).toBe(1_000_000);
        expect(afterBalance?.locked).toBe(0);

        const cancelledOrder = exchange.getOrder(
            "cancel-order-1"
        );

        expect(cancelledOrder).toBeDefined();
        expect(cancelledOrder?.status).toBe("CANCELLED");
    });

    test("should reject an order when balance is insufficient", () => {
        

        exchange.createAccount("poor-user");

        exchange.addBalance(
            "poor-user",
            "USDT",
            100
        );

        const order = createOrder(
            "insufficient-order",
            "poor-user",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        expect(() => {
            exchange.placeOrder(order);
        }).toThrow("Insufficient balance");

        const savedOrder = exchange.getOrder(
            "insufficient-order"
        );

        expect(savedOrder).toBeUndefined();
    });

    test("should reject duplicate account", () => {
    

        exchange.createAccount("alice");

        expect(() => {
            exchange.createAccount("alice");
        }).toThrow("Account already exists");
    });

    test("should reject duplicate order", () => {
    

        exchange.createAccount("alice");

        exchange.addBalance(
            "alice",
            "USDT",
            10000
        );

        const order = createOrder(
            "duplicate-order",
            "alice",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        );

        exchange.placeOrder(order);

        expect(() => {
            exchange.placeOrder(order);
        }).toThrow("Order already exists");
    });

});


test("should cancel MARKET BUY when there is no liquidity", () => {


    exchange.createAccount("alice");

    exchange.addBalance(
        "alice",
        "USDT",
        1000
    );

    const order = createOrder(
        "market-buy-1",
        "alice",
        "BTCUSDT",
        "BUY",
        "MARKET",
        0,
        0.01,
        Date.now(),
        1000
    );

    const result = exchange.placeOrder(order);

    expect(result.status).toBe("CANCELLED");
    expect(result.trades).toHaveLength(0);
    expect(result.remainingQuantity).toBe(1_000_000);

    const account = exchange.getAccount("alice");

    const usdt = account?.balances.get("USDT");

    expect(usdt?.available).toBe(100_000);
    expect(usdt?.locked).toBe(0);
    expect(exchange.getOrder(order.id)?.status).toBe("CANCELLED");
});



test("should cancel MARKET SELL when there is no liquidity", () => {


    exchange.createAccount("alice");

    exchange.addBalance(
        "alice",
        "BTC",
        0.01
    );

    const order = createOrder(
        "market-sell-1",
        "alice",
        "BTCUSDT",
        "SELL",
        "MARKET",
        0,
        0.01,
        Date.now()
    );

    const result = exchange.placeOrder(order);

    expect(result.status).toBe("CANCELLED");
    expect(result.trades).toHaveLength(0);
    expect(result.remainingQuantity).toBe(1_000_000);

    const account = exchange.getAccount("alice");

    const btc = account?.balances.get("BTC");

    expect(btc?.available).toBe(1_000_000);
    expect(btc?.locked).toBe(0);
});


test("should execute MARKET BUY against a resting SELL order", () => {
    

    exchange.createAccount("seller");
    exchange.createAccount("buyer");

    exchange.addBalance("seller", "BTC", 0.01);
    exchange.addBalance("buyer", "USDT", 1000);

    const sellOrder = createOrder(
        "sell-market-buy-1",
        "seller",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        85000,
        0.01,
        Date.now()
    );

    exchange.placeOrder(sellOrder);

    const buyOrder = createOrder(
        "market-buy-1",
        "buyer",
        "BTCUSDT",
        "BUY",
        "MARKET",
        0,
        0.01,
        Date.now(),
        1000
    );

    const result = exchange.placeOrder(buyOrder);

    expect(result.status).toBe("FILLED");
    expect(result.trades).toHaveLength(1);

    expect(result.trades[0]?.price).toBe(8_500_000);
    expect(result.trades[0]?.quantity).toBe(1_000_000);

    const buyerAccount = exchange.getAccount("buyer");
    const sellerAccount = exchange.getAccount("seller");

    const buyerBTC = buyerAccount?.balances.get("BTC");
    const buyerUSDT = buyerAccount?.balances.get("USDT");

    const sellerBTC = sellerAccount?.balances.get("BTC");
    const sellerUSDT = sellerAccount?.balances.get("USDT");

    expect(buyerBTC?.available).toBe(1_000_000);
    expect(buyerUSDT?.available).toBe(15_000);
    expect(buyerUSDT?.locked).toBe(0);

    expect(sellerBTC?.available).toBe(0);
    expect(sellerUSDT?.available).toBe(85_000);
    expect(sellerUSDT?.locked).toBe(0);
});


test("should execute MARKET SELL against a resting BUY order", () => {
   
    exchange.createAccount("buyer");
    exchange.createAccount("seller");

    exchange.addBalance("buyer", "USDT", 1000);
    exchange.addBalance("seller", "BTC", 0.01);

    const buyOrder = createOrder(
        "buy-market-sell-1",
        "buyer",
        "BTCUSDT",
        "BUY",
        "LIMIT",
        85000,
        0.01,
        Date.now()
    );

    exchange.placeOrder(buyOrder);

    const sellOrder = createOrder(
        "market-sell-1",
        "seller",
        "BTCUSDT",
        "SELL",
        "MARKET",
        0,
        0.01,
        Date.now()
    );

    const result = exchange.placeOrder(sellOrder);

    expect(result.status).toBe("FILLED");
    expect(result.trades).toHaveLength(1);

    expect(result.trades[0]?.price).toBe(8_500_000);
    expect(result.trades[0]?.quantity).toBe(1_000_000);

    const buyerAccount = exchange.getAccount("buyer");
    const sellerAccount = exchange.getAccount("seller");

    const buyerBTC = buyerAccount?.balances.get("BTC");
    const buyerUSDT = buyerAccount?.balances.get("USDT");

    const sellerBTC = sellerAccount?.balances.get("BTC");
    const sellerUSDT = sellerAccount?.balances.get("USDT");

    expect(buyerBTC?.available).toBe(1_000_000);
    expect(buyerUSDT?.available).toBe(15_000);
    expect(buyerUSDT?.locked).toBe(0);

    expect(sellerBTC?.available).toBe(0);
    expect(sellerBTC?.locked).toBe(0);
    expect(sellerUSDT?.available).toBe(85_000);
});


test("should partially fill a LIMIT BUY order", () => {


    exchange.createAccount("buyer");
    exchange.createAccount("seller");

    exchange.addBalance("buyer", "USDT", 2000);
    exchange.addBalance("seller", "BTC", 0.01);

    const sellOrder = createOrder(
        "partial-sell-1",
        "seller",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        85000,
        0.01,
        Date.now()
    );

    exchange.placeOrder(sellOrder);

    const buyOrder = createOrder(
        "partial-buy-1",
        "buyer",
        "BTCUSDT",
        "BUY",
        "LIMIT",
        85000,
        0.02,
        Date.now()
    );

    const result = exchange.placeOrder(buyOrder);

    expect(result.status).toBe("PARTIALLY_FILLED");
    expect(result.trades).toHaveLength(1);
    expect(result.remainingQuantity).toBe(1_000_000);

    const order = exchange.getOrder("partial-buy-1");

    expect(order?.status).toBe("PARTIALLY_FILLED");
    expect(order?.filledQuantity).toBe(1_000_000);

    const buyerAccount = exchange.getAccount("buyer");
    const buyerUSDT = buyerAccount?.balances.get("USDT");

    expect(buyerUSDT?.available).toBe(30_000);
    expect(buyerUSDT?.locked).toBe(85_000);
});


test("should update a resting SELL order after a partial fill", () => {
    exchange.createAccount("seller");
    exchange.createAccount("buyer");

    exchange.addBalance("seller", "BTC", 0.02);
    exchange.addBalance("buyer", "USDT", 2000);

    const sellOrder = createOrder(
        "resting-sell",
        "seller",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        85000,
        0.02,
        Date.now()
    );

    exchange.placeOrder(sellOrder);

    const buyOrder = createOrder(
        "incoming-buy",
        "buyer",
        "BTCUSDT",
        "BUY",       // side
        "LIMIT",     // type
        85000,       // price
        0.01,        // quantity
        Date.now()   // timestamp
    );

    const result = exchange.placeOrder(buyOrder);

    expect(result.status).toBe("FILLED");
    expect(result.trades).toHaveLength(1);

    const restingOrder = exchange.getOrder("resting-sell");
    const orderBook = exchange.getOrderBook();
    const remainingSell =
        orderBook.asks.get(8_500_000)?.orders[0];

    expect(restingOrder?.status).toBe("PARTIALLY_FILLED");
    expect(restingOrder?.filledQuantity).toBe(1_000_000);
    expect(remainingSell?.quantity).toBe(1_000_000);
});


test("should partially fill a LIMIT SELL order", () => {


    exchange.createAccount("buyer");
    exchange.createAccount("seller");

    exchange.addBalance("buyer", "USDT", 2000);
    exchange.addBalance("seller", "BTC", 0.02);

    const buyOrder = createOrder(
        "partial-buy-2",
        "buyer",
        "BTCUSDT",
        "BUY",
        "LIMIT",
        85000,
        0.01,
        Date.now()
    );

    exchange.placeOrder(buyOrder);

    const sellOrder = createOrder(
        "partial-sell-2",
        "seller",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        85000,
        0.02,
        Date.now()
    );

    const result = exchange.placeOrder(sellOrder);

    expect(result.status).toBe("PARTIALLY_FILLED");
    expect(result.trades).toHaveLength(1);
    expect(result.remainingQuantity).toBe(1_000_000);

    const order = exchange.getOrder("partial-sell-2");

    expect(order?.status).toBe("PARTIALLY_FILLED");
    expect(order?.filledQuantity).toBe(1_000_000);

    const sellerAccount = exchange.getAccount("seller");
    const sellerBTC = sellerAccount?.balances.get("BTC");

    expect(sellerBTC?.available).toBe(0);
    expect(sellerBTC?.locked).toBe(1_000_000);
});


test("should keep an unmatched LIMIT order in the order book", () => {


    exchange.createAccount("buyer");

    exchange.addBalance("buyer", "USDT", 1000);

    const order = createOrder(
        "book-buy-1",
        "buyer",
        "BTCUSDT",
        "BUY",
        "LIMIT",
        85000,
        0.01,
        Date.now()
    );

    const result = exchange.placeOrder(order);

    expect(result.status).toBe("OPEN");

    const orderBook = exchange.getOrderBook();

    const bid = orderBook.bids.get(8_500_000);

    expect(bid).toBeDefined();
    expect(bid?.orders).toHaveLength(1);
    expect(bid?.orders[0]?.id).toBe("book-buy-1");
    expect(bid?.orders[0]?.quantity).toBe(1_000_000);
});


test("should match the best price first", () => {


    exchange.createAccount("seller-1");
    exchange.createAccount("seller-2");
    exchange.createAccount("buyer");

    exchange.addBalance("seller-1", "BTC", 0.01);
    exchange.addBalance("seller-2", "BTC", 0.01);
    exchange.addBalance("buyer", "USDT", 3000);

    const sell1 = createOrder(
        "best-price-sell-1",
        "seller-1",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        86000,
        0.01,
        Date.now()
    );

    const sell2 = createOrder(
        "best-price-sell-2",
        "seller-2",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        85000,
        0.01,
        Date.now()
    );

    exchange.placeOrder(sell1);
    exchange.placeOrder(sell2);

    const buy = createOrder(
        "best-price-buy-1",
        "buyer",
        "BTCUSDT",
        "BUY",
        "MARKET",
        0,
        0.01,
        Date.now(),
        1000
    );

    const result = exchange.placeOrder(buy);

    expect(result.status).toBe("FILLED");
    expect(result.trades).toHaveLength(1);

    expect(result.trades[0]?.price).toBe(8_500_000);
    expect(result.trades[0]?.sellOrderId).toBe("best-price-sell-2");
});


test("should preserve price-time priority at the same price", () => {
   

    exchange.createAccount("seller-1");
    exchange.createAccount("seller-2");
    exchange.createAccount("buyer");

    exchange.addBalance("seller-1", "BTC", 0.01);
    exchange.addBalance("seller-2", "BTC", 0.01);
    exchange.addBalance("buyer", "USDT", 2000);

    const firstSell = createOrder(
        "time-sell-1",
        "seller-1",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        85000,
        0.01,
        1
    );

    const secondSell = createOrder(
        "time-sell-2",
        "seller-2",
        "BTCUSDT",
        "SELL",
        "LIMIT",
        85000,
        0.01,
        2
    );

    exchange.placeOrder(firstSell);
    exchange.placeOrder(secondSell);

    const buy = createOrder(
        "time-buy-1",
        "buyer",
        "BTCUSDT",
        "BUY",
        "MARKET",
        0,
        0.01,
        3,
        1000
    );

    const result = exchange.placeOrder(buy);

    expect(result.status).toBe("FILLED");
    expect(result.trades).toHaveLength(1);

    expect(result.trades[0]?.sellOrderId).toBe("time-sell-1");
});


test("should execute a MARKET BUY across multiple SELL price levels", () => {


    exchange.createAccount("seller-1");
    exchange.createAccount("seller-2");
    exchange.createAccount("seller-3");
    exchange.createAccount("buyer");

    exchange.addBalance("seller-1", "BTC", 0.01);
    exchange.addBalance("seller-2", "BTC", 0.01);
    exchange.addBalance("seller-3", "BTC", 0.01);
    exchange.addBalance("buyer", "USDT", 3000);

    exchange.placeOrder(
        createOrder(
            "multi-sell-1",
            "seller-1",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        )
    );

    exchange.placeOrder(
        createOrder(
            "multi-sell-2",
            "seller-2",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            86000,
            0.01,
            Date.now()
        )
    );

    exchange.placeOrder(
        createOrder(
            "multi-sell-3",
            "seller-3",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            87000,
            0.01,
            Date.now()
        )
    );

    const result = exchange.placeOrder(
        createOrder(
            "multi-market-buy",
            "buyer",
            "BTCUSDT",
            "BUY",
            "MARKET",
            0,
            0.03,
            Date.now(),
            3000
        )
    );

    expect(result.status).toBe("FILLED");
    expect(result.trades).toHaveLength(3);

    expect(result.trades[0]?.price).toBe(8_500_000);
    expect(result.trades[1]?.price).toBe(8_600_000);
    expect(result.trades[2]?.price).toBe(8_700_000);

    expect(result.trades[0]?.quantity).toBe(1_000_000);
    expect(result.trades[1]?.quantity).toBe(1_000_000);
    expect(result.trades[2]?.quantity).toBe(1_000_000);

    const buyerAccount = exchange.getAccount("buyer");
    const buyerUSDT = buyerAccount?.balances.get("USDT");
    const buyerBTC = buyerAccount?.balances.get("BTC");

    expect(buyerUSDT?.available).toBe(42_000);
    expect(buyerUSDT?.locked).toBe(0);
    expect(buyerBTC?.available).toBe(3_000_000);
});


test("should cancel a partially filled MARKET SELL and release remaining BTC", () => {


    exchange.createAccount("buyer");
    exchange.createAccount("seller");

    exchange.addBalance("buyer", "USDT", 2000);
    exchange.addBalance("seller", "BTC", 0.02);

    exchange.placeOrder(
        createOrder(
            "partial-market-buy",
            "buyer",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        )
    );

    const result = exchange.placeOrder(
        createOrder(
            "partial-market-sell",
            "seller",
            "BTCUSDT",
            "SELL",
            "MARKET",
            0,
            0.02,
            Date.now()
        )
    );

    expect(result.status).toBe("PARTIALLY_FILLED");
    expect(result.trades).toHaveLength(1);
    expect(result.remainingQuantity).toBe(1_000_000);

    const sellerAccount = exchange.getAccount("seller");
    const sellerBTC = sellerAccount?.balances.get("BTC");

    expect(sellerBTC?.available).toBe(1_000_000);
    expect(sellerBTC?.locked).toBe(0);
});


test("should cancel a MARKET BUY when max quote amount is unused", () => {


    exchange.createAccount("buyer");
    exchange.createAccount("seller");

    exchange.addBalance("buyer", "USDT", 2000);
    exchange.addBalance("seller", "BTC", 0.01);

    exchange.placeOrder(
        createOrder(
            "unused-buy-sell",
            "seller",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        )
    );

    const result = exchange.placeOrder(
        createOrder(
            "unused-market-buy",
            "buyer",
            "BTCUSDT",
            "BUY",
            "MARKET",
            0,
            0.01,
            Date.now(),
            1500
        )
    );

    expect(result.status).toBe("FILLED");
    expect(result.trades).toHaveLength(1);

    const buyerAccount = exchange.getAccount("buyer");
    const buyerUSDT = buyerAccount?.balances.get("USDT");

    expect(buyerUSDT?.available).toBe(115_000);
    expect(buyerUSDT?.locked).toBe(0);
});


test("should return not found when cancelling an unknown order", () => {
    

    const result = exchange.cancelOrder("does-not-exist");

    expect(result.success).toBe(false);
    expect(result.orderId).toBe("does-not-exist");
});


test("should return an order by ID", () => {


    exchange.createAccount("buyer");
    exchange.addBalance("buyer", "USDT", 1000);

    exchange.placeOrder(
        createOrder(
            "get-order-1",
            "buyer",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        )
    );

    const order = exchange.getOrder("get-order-1");

    expect(order).toBeDefined();
    expect(order?.order.id).toBe("get-order-1");
    expect(order?.order.accountId).toBe("buyer");
    expect(order?.status).toBe("OPEN");
    expect(order?.originalQuantity).toBe(1_000_000);
    expect(order?.filledQuantity).toBe(0);
});


test("should return all managed orders", () => {


    exchange.createAccount("buyer");
    exchange.addBalance("buyer", "USDT", 2000);

    exchange.placeOrder(
        createOrder(
            "orders-1",
            "buyer",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        )
    );

    exchange.placeOrder(
        createOrder(
            "orders-2",
            "buyer",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            86000,
            0.01,
            Date.now()
        )
    );

    const orders = exchange.getOrders();

    expect(orders).toHaveLength(2);
    expect(orders.map(order => order.order.id)).toEqual([
        "orders-1",
        "orders-2"
    ]);
});


test("should return the current order book", () => {


    exchange.createAccount("buyer");
    exchange.createAccount("seller");

    exchange.addBalance("buyer", "USDT", 1000);
    exchange.addBalance("seller", "BTC", 0.01);

    exchange.placeOrder(
        createOrder(
            "book-bid",
            "buyer",
            "BTCUSDT",
            "BUY",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        )
    );

    exchange.placeOrder(
        createOrder(
            "book-ask",
            "seller",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            86000,
            0.01,
            Date.now()
        )
    );

    const orderBook = exchange.getOrderBook();

    expect(orderBook.bids.size).toBe(1);
    expect(orderBook.asks.size).toBe(1);

    expect(orderBook.bids.get(8_500_000)?.orders[0]?.id)
        .toBe("book-bid");

    expect(orderBook.asks.get(8_600_000)?.orders[0]?.id)
        .toBe("book-ask");
});


test("should not exceed max quote amount for MARKET BUY", () => {


    exchange.createAccount("seller-1");
    exchange.createAccount("seller-2");
    exchange.createAccount("buyer");

    exchange.addBalance("seller-1", "BTC", 0.01);
    exchange.addBalance("seller-2", "BTC", 0.01);
    exchange.addBalance("buyer", "USDT", 2000);

    exchange.placeOrder(
        createOrder(
            "budget-sell-1",
            "seller-1",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            85000,
            0.01,
            Date.now()
        )
    );

    exchange.placeOrder(
        createOrder(
            "budget-sell-2",
            "seller-2",
            "BTCUSDT",
            "SELL",
            "LIMIT",
            86000,
            0.01,
            Date.now()
        )
    );

    const result = exchange.placeOrder(
        createOrder(
            "budget-market-buy",
            "buyer",
            "BTCUSDT",
            "BUY",
            "MARKET",
            0,
            0.02,
            Date.now(),
            1000
        )
    );

    expect(result.trades).toHaveLength(1);

    expect(result.trades[0]?.price).toBe(8_500_000);
    expect(result.trades[0]?.quantity).toBe(1_000_000);

    expect(result.remainingQuantity).toBe(1_000_000);

    const buyerAccount = exchange.getAccount("buyer");
const buyerUSDT = buyerAccount?.balances.get("USDT");
const buyerBTC = buyerAccount?.balances.get("BTC");

expect(buyerBTC?.available).toBe(1_000_000);

expect(buyerUSDT?.available).toBe(115_000);

expect(buyerUSDT?.locked).toBe(0);
});