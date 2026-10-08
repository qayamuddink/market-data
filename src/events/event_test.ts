import { EventBus } from "./event_bus";

const eventBus = new EventBus();

eventBus.subscribe((event) => {
    console.log("Listener received:", event);
})


eventBus.publish({
    type:"TradeExecuted",
    trade: {
        id: "trade-1",
        symbol: "BTCUSDT",
        price: 85000,
        quantity: 0.01,
        buyOrderId: "buy-1",
        sellOrderId: "sell-1",
        buyAccountId: "account-1",
        sellAccountId: "account-2",
        timestamp: Date.now()
    }
})