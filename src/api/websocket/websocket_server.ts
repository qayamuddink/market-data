import { WebSocketServer } from "ws";
import type { EventBus } from "../../events/event_bus";
import type { Exchange } from "../../exchange/exchange";
import type { WebSocketManager } from "./websocket_manager";
import type { ClientMessage } from "./websocket_types";
import { formatTrade } from "../../market/trade_formatter";
import { formatOrderBook } from "../../market/orderbook_fornatter";
import { formatTicker } from "../../market/ticker_formatter";
import { unitsToQuantity } from "../../market/precision";

export class WebSocketServerManager {
    private server: WebSocketServer;

    constructor(
        private eventBus: EventBus,
        private websocketManager: WebSocketManager,
        private exchange: Exchange
    ) {
        this.server = new WebSocketServer({
            port: 8080
        });

        this.setup();
    }

    private setup(): void {
        this.server.on("connection", (ws) => {
            console.log(
                "WebSocket client connected"
            );

            this.websocketManager.addClient(ws);

            ws.on("message", (message) => {
                const clientMessage =
                    JSON.parse(
                        message.toString()
                    ) as ClientMessage;

                if (
                    clientMessage.type ===
                    "subscribe"
                ) {
                    this.websocketManager.subscribe(
                        ws,
                        {
                            channel:
                                clientMessage.channel,
                            symbol:
                                clientMessage.symbol,
                            accountId:
                                clientMessage.accountId
                        }
                    );

                    ws.send(
                        JSON.stringify({
                            type: "subscribed",
                            channel:
                                clientMessage.channel,
                            symbol:
                                clientMessage.symbol,
                            accountId:
                                clientMessage.accountId
                        })
                    );

                    // Send the current order book immediately.
                    if (
                        clientMessage.channel ===
                            "orderbook" &&
                        clientMessage.symbol
                    ) {
                        ws.send(
                            JSON.stringify({
                                type: "orderbook",
                                symbol:
                                    clientMessage.symbol,
                                orderBook:
                                    formatOrderBook(
                                        this.exchange.getOrderBook()
                                    )
                            })
                        );
                    }

                    return;
                }

                if (
                    clientMessage.type ===
                    "unsubscribe"
                ) {
                    this.websocketManager.unsubscribe(
                        ws,
                        {
                            channel:
                                clientMessage.channel,
                            symbol:
                                clientMessage.symbol,
                            accountId:
                                clientMessage.accountId
                        }
                    );

                    ws.send(
                        JSON.stringify({
                            type: "unsubscribed",
                            channel:
                                clientMessage.channel,
                            symbol:
                                clientMessage.symbol,
                            accountId:
                                clientMessage.accountId
                        })
                    );
                }
            });

            ws.on("close", () => {
                console.log(
                    "WebSocket client disconnected"
                );

                this.websocketManager.removeClient(
                    ws
                );
            });
        });

        this.eventBus.subscribe((event) => {
            if (
                event.type ===
                "TradeExecuted"
            ) {
                this.websocketManager.broadcast(
                    "trades",
                    event.trade.symbol,
                    {
                        type: "trade",
                        trade: formatTrade(
                            event.trade
                        )
                    }
                );
            }

            if (
                event.type ===
                "OrderBookUpdated"
            ) {
                this.websocketManager.broadcast(
                    "orderbook",
                    event.symbol,
                    {
                        type: "orderbook",
                        symbol: event.symbol,
                        orderBook:
                            formatOrderBook(
                                event.orderBook
                            )
                    }
                );
            }

            if (
                event.type ===
                "TickerUpdated"
            ) {
                this.websocketManager.broadcast(
                    "ticker",
                    event.symbol,
                    {
                        type: "ticker",
                        ...formatTicker(event)
                    }
                );
            }

            if (
                event.type ===
                "OrderUpdated"
            ) {
                this.websocketManager.broadcastToAccount(
                    event.order.accountId,
                    {
                        type: "order",
                        order: {
                            ...event.order,
                            originalQuantity:
                                unitsToQuantity(
                                    event.order.originalQuantity
                                ),
                            filledQuantity:
                                unitsToQuantity(
                                    event.order.filledQuantity
                                )
                        }
                    }
                );
            }
        });

        console.log(
            "WebSocket server started on port 8080"
        );
    }
}
