import express from "express";
import { ZodError } from "zod";
import { formatAccount } from "../account/account_formatter";
import { PostgresPersistence } from "../database/postgres_persistence";
import { EventBus } from "../events/event_bus";
import { Exchange } from "../exchange/exchange";
import { createOrder } from "../market/order-factory";
import { formatOrder } from "../market/order_formatter";
import { FormatOrderResult } from "../market/order_result_formatter";
import { formatOrderBook } from "../market/orderbook_fornatter";
import { formatTicker } from "../market/ticker_formatter";
import { formatTrade } from "../market/trade_formatter";
import { depositSchema, orderSchema } from "./order_schema";
import { WebSocketManager } from "./websocket/websocket_manager";
import { WebSocketServerManager } from "./websocket/websocket_server";

const app = express();
app.use(express.json());

const eventBus = new EventBus();
const exchange = new Exchange(eventBus, new PostgresPersistence());
const websocketManager = new WebSocketManager();

new WebSocketServerManager(eventBus, websocketManager, exchange);

app.post("/accounts", async (req, res) => {
    const { accountId } = req.body;
    await exchange.createAccount(accountId);
    res.json({ id: accountId });
});

app.post("/accounts/:accountId/deposit", (req, res) => {
    const { accountId } = req.params;
    const data = depositSchema.parse(req.body);

    exchange.addBalance(accountId, data.asset, data.amount);

    res.json({
        accountId,
        asset: data.asset,
        amount: data.amount,
    });
});

app.get("/accounts/:accountId", (req, res) => {
    const { accountId } = req.params;
    const account = exchange.getAccount(accountId);

    if (!account) {
        return res.status(404).json({ error: "Account not found" });
    }

    res.json(formatAccount(account));
});

app.post("/orders", (req, res) => {
    const data = orderSchema.parse(req.body);
    const order = createOrder(
        data.id,
        data.accountId,
        data.symbol,
        data.side,
        data.type,
        data.price,
        data.quantity,
        Date.now(),
        data.maxQuoteAmount,
    );

    const result = exchange.placeOrder(order);
    res.json(FormatOrderResult(result));
});

app.get("/orders", (_req, res) => {
    res.json(exchange.getOrders().map(formatOrder));
});

app.get("/orders/:orderId", (req, res) => {
    const { orderId } = req.params;
    const order = exchange.getOrder(orderId);

    if (!order) {
        return res.status(404).json({ error: "Order not found" });
    }

    res.json(formatOrder(order));
});

app.delete("/orders/:orderId", (req, res) => {
    const { orderId } = req.params;
    const result = exchange.cancelOrder(orderId);

    if (!result.success) {
        return res.status(404).json({ error: "Order not found" });
    }

    res.json(result);
});

app.get("/orderbook", (req, res) => {
    const symbol = req.query.symbol;

    if (typeof symbol !== "string" || !symbol.trim()) {
        return res.status(400).json({
            error: "symbol query parameter is required",
        });
    }

    res.json(formatOrderBook(exchange.getOrderBook(symbol)));
});

app.get("/trades", (req, res) => {
    const symbol = req.query.symbol;

    if (typeof symbol !== "string" || !symbol.trim()) {
        return res.status(400).json({
            error: "symbol query parameter is required",
        });
    }

    const trades = exchange.getMarketData().getTrades(symbol);
    res.json(trades.map(formatTrade));
});

app.get("/ticker", (req, res) => {
    const symbol = req.query.symbol;

    if (typeof symbol !== "string" || !symbol.trim()) {
        return res.status(400).json({
            error: "symbol query parameter is required",
        });
    }

    const lastPrice = exchange.getMarketData().getLastPrice(symbol);
    const bestBid = exchange.getBestBid(symbol);
    const bestAsk = exchange.getBestAsk(symbol);

    res.json(
        formatTicker({
            symbol,
            lastPrice: lastPrice ?? 0,
            bestBid: bestBid?.price,
            bestAsk: bestAsk?.price,
        }),
    );
});

app.use(
    (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
    ) => {
        console.error(err.message);

        if (err instanceof ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: err.issues.map(issue => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        return res.status(400).json({ error: err.message });
    },
);

export { app };

export async function startServer() {
    await exchange.restoreAccounts();

    app.listen(3000, () => {
        console.log("Exchange API server running on port 3000");
    });
}
