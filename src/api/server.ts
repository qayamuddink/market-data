import express from "express"
import { Exchange } from "../exchange/exchange";
import { createOrder } from "../market/order-factory";
import { formatOrder } from "../market/order_formatter";
import { formatAccount } from "../account/account_formatter";
import { depositSchema, orderSchema } from "./order_schema";
import { ZodError } from "zod";
import { FormatOrderResult } from "../market/order_result_formatter";
import { formatOrderBook } from "../market/orderbook_fornatter";

import { EventBus } from "../events/event_bus";
import { WebSocketManager } from "./websocket/websocket_manager";
import { WebSocketServerManager } from "./websocket/websocket_server";

const app = express();

app.use(express.json());

const eventBus = new EventBus();

const exchange = new Exchange(eventBus);

const websocketManager = new WebSocketManager();

new WebSocketServerManager(
    eventBus,
    websocketManager
);


app.post("/accounts" , (req,res) => {
    const {accountId} = req.body;

    exchange.createAccount(accountId);

    res.json({
        id: accountId
    })
})

app.post("/accounts/:accountId/deposit" , (req,res) => {
    
    const { accountId } = req.params;

    const data = depositSchema.parse(req.body);
    
    exchange.addBalance(
        accountId,
        data.asset,
        data.amount
    );

    res.json({
        accountId,
        asset: data.asset,
        amount: data.amount
    });

})


app.get("/accounts/:accountId" , (req,res) => {
    const {accountId} = req.params;
    const account = exchange.getAccount(accountId);
    
    if(!account){
        return res.status(404).json({
            error: "Account not found"
        })
    }

    res.json(formatAccount(account))
})


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
        data.maxQuoteAmount
    );

    const result = exchange.placeOrder(order);

    res.json(FormatOrderResult(result));
});

app.get("/orders", (req, res) => {
    const orders = exchange.getOrders();

    res.json(
        orders.map(formatOrder)
    );
});

app.get("/orders/:orderId" , (req,res) => {
    const { orderId } = req.params;

    const order = exchange.getOrder(orderId);

    if(!order) {
        return res.status(404).json({
            error: "Order not found"
        })
    }

    res.json(formatOrder(order))
})

app.delete("/orders/:orderId" , (req,res) => {
    const { orderId }= req.params;

    const result = exchange.cancelOrder(orderId);

    if(!result.success){
        return res.status(404).json({
            error: "order not found"
        })
    }

    res.json(result);
})


app.get("/orderbook", (req,res) => {
    const orderBook = exchange.getOrderBook();
    res.json(formatOrderBook(orderBook));
})

app.use(
    (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        console.error(err.message);

        if (err instanceof ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: err.issues.map(issue => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            });
        }

        return res.status(400).json({
            error: err.message
        });
    }
);

export {app}