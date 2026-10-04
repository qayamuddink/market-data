import type { Order } from "../types/order";
import { OrderBook } from "./order-book";


const orderBook = new OrderBook()

const order1 : Order = {
    id: "order-1",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "LIMIT",
    price:  84000,
    quantity: 0.01,
    timestamp: Date.now()
}

const order2 : Order = {
    id: "order-2",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "LIMIT",
    price:  84000,
    quantity: 0.02,
    timestamp: Date.now()
}

const order3: Order = {
    id: "order-3",
    symbol: "BTCUSDT",
    side: "SELL",
    type: "LIMIT",
    price: 85000,
    quantity: 0.03,
    timestamp: Date.now()
};


const buyOrder: Order = {
    id: "order-4",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "LIMIT",
    price: 85100,
    quantity: 0.05,
    timestamp: Date.now()
};


const order5: Order = {
    id: "order-5",
    symbol: "BTCUSDT",
    side: "SELL",
    type: "LIMIT",
    price: 85100,
    quantity: 0.03,
    timestamp: Date.now()
};


orderBook.addOrder(order1)
orderBook.addOrder(order2)
orderBook.addOrder(order3)

orderBook.addOrder(order5);

console.log(orderBook.getBook());

console.log("Best Bid:", orderBook.getBestBid());
console.log("Best Ask:", orderBook.getBestAsk());


const trade = orderBook.matchOrder(buyOrder);

console.log("Executed Trade:", trade);
console.log("Order Book After Match:", orderBook.getBook());