import { WebSocketServer } from "ws";
import type { EventBus } from "../../events/event_bus";
import type { WebSocketManager } from "./websocket_manager";
import type { ClientMessage } from "./websocket_types";
import { formatTrade } from "../../market/trade_formatter";
import { formatOrderBook } from "../../market/orderbook_fornatter";
import { symbol } from "zod";


export class WebSocketServerManager {

    private server: WebSocketServer;

    constructor(
        private eventBus: EventBus,
        private websocketManager: WebSocketManager
    ) {
        this.server = new WebSocketServer({
            port: 8080
        });

        this.setup();
    }

    private setup(): void {

        this.server.on("connection", (ws) => {

            console.log("WebSocket client connected");

            this.websocketManager.addClient(ws);

            ws.on("message", (message) => {

                const clientMessage =
                    JSON.parse(message.toString()) as ClientMessage;

                if (clientMessage.type === "subscribe") {

                    this.websocketManager.subscribe(
                        ws,
                        {
                            channel: clientMessage.channel,
                            symbol: clientMessage.symbol
                        }
                    );

                    ws.send(JSON.stringify({
                        type: "subscribed",
                        channel: clientMessage.channel,
                        symbol: clientMessage.symbol
                    }));

                    return;
                }

                if (clientMessage.type === "unsubscribe") {

                    this.websocketManager.unsubscribe(
                        ws,
                        {
                            channel: clientMessage.channel,
                            symbol: clientMessage.symbol
                        }
                    );

                    ws.send(JSON.stringify({
                        type: "unsubscribed",
                        channel: clientMessage.channel,
                        symbol: clientMessage.symbol
                    }));
                }
            });

            ws.on("close", () => {

                console.log(
                    "WebSocket client disconnected"
                );

                this.websocketManager.removeClient(ws);
            });
        });

        this.eventBus.subscribe((event) => {

            if (event.type === "TradeExecuted") {

                this.websocketManager.broadcast(
                    "trades",
                    event.trade.symbol,
                    {
                        type:"trade",
                        trade: formatTrade(event.trade)
                    }
                );
            }

            if (event.type === "OrderBookUpdated") {

                this.websocketManager.broadcast(
                    "orderbook",
                    event.symbol,
                    {
                        type: "orderbook",
                        symbol: event.symbol,
                        orderBook: formatOrderBook(event.orderBook)
                    }
                );
            }

            if(event.type === "TickerUpdated"){
                this.websocketManager.broadcast(
                    "ticker",
                    event.symbol,
                    {
                        type: "ticker",
                        symbol: event.symbol,
                        lastprice:event.lastPrice,
                        bestBid: event.bestBid,
                        bestAsk: event.bestAsk
                    }
                )
            }

        });

        

        console.log(
            "WebSocket server started on port 8080"
        );
    }
}