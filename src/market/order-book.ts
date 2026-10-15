import { calculateQuoteAmount, unitsToAmount } from "../account/asset";
import type {
    CancelResult,
    ExecuteTrade,
    MatchResult,
    Order,
    OrderBook as OrderBookType,
    OrderResult,
    OrderStatus,
    PriceLevel,
} from "../types/order";
import { validateOrder } from "./order_validation";
import { generateTradeId } from "./trade_id";

export class OrderBook {
    // Each symbol has its own bids and asks.
    private bids: Map<string, Map<number, PriceLevel>> = new Map();
    private asks: Map<string, Map<number, PriceLevel>> = new Map();

    addOrder(order: Order): void {
        const books = order.side === "BUY" ? this.bids : this.asks;
        let book = books.get(order.symbol);

        if (!book) {
            book = new Map<number, PriceLevel>();
            books.set(order.symbol, book);
        }

        const priceLevel = book.get(order.price);

        if (priceLevel) {
            // Appending preserves FIFO time priority at this price.
            priceLevel.orders.push(order);
            return;
        }

        book.set(order.price, {
            price: order.price,
            orders: [order],
        });
    }

    getBook(symbol?: string): OrderBookType {
        if (symbol) {
            return {
                bids: this.bids.get(symbol) ?? new Map<number, PriceLevel>(),
                asks: this.asks.get(symbol) ?? new Map<number, PriceLevel>(),
            };
        }

        // Compatibility for callers that still request the whole book.
        // Market-facing API endpoints should always pass a symbol.
        return {
            bids: this.combineBooks(this.bids),
            asks: this.combineBooks(this.asks),
        };
    }

    private combineBooks(
        books: Map<string, Map<number, PriceLevel>>,
    ): Map<number, PriceLevel> {
        const combined = new Map<number, PriceLevel>();

        for (const book of books.values()) {
            for (const [price, level] of book) {
                const existing = combined.get(price);

                if (existing) {
                    existing.orders.push(...level.orders);
                } else {
                    combined.set(price, {
                        price,
                        orders: [...level.orders],
                    });
                }
            }
        }

        return combined;
    }

    getBestBid(symbol?: string): PriceLevel | undefined {
        let bestBid: PriceLevel | undefined;
        const books = symbol
            ? [this.bids.get(symbol)].filter(
                  (book): book is Map<number, PriceLevel> => book !== undefined,
              )
            : Array.from(this.bids.values());

        for (const book of books) {
            for (const priceLevel of book.values()) {
                if (!bestBid || priceLevel.price > bestBid.price) {
                    bestBid = priceLevel;
                }
            }
        }

        return bestBid;
    }

    getBestAsk(symbol?: string): PriceLevel | undefined {
        let bestAsk: PriceLevel | undefined;
        const books = symbol
            ? [this.asks.get(symbol)].filter(
                  (book): book is Map<number, PriceLevel> => book !== undefined,
              )
            : Array.from(this.asks.values());

        for (const book of books) {
            for (const priceLevel of book.values()) {
                if (!bestAsk || priceLevel.price < bestAsk.price) {
                    bestAsk = priceLevel;
                }
            }
        }

        return bestAsk;
    }

    matchOrder(order: Order): MatchResult {
        const trades: ExecuteTrade[] = [];
        let remainingQuantity = order.quantity;

        if (order.side === "BUY") {
            let remainingQuoteAmount = order.maxQuoteAmount;

            while (remainingQuantity > 0) {
                const bestAsk = this.getBestAsk(order.symbol);
                if (!bestAsk) break;

                if (order.type === "LIMIT" && order.price < bestAsk.price) {
                    break;
                }

                const asks = this.asks.get(order.symbol);
                const matchedOrder = bestAsk.orders[0];
                if (!matchedOrder) break;

                let tradeQuantity = Math.min(
                    remainingQuantity,
                    matchedOrder.quantity,
                );

                // A MARKET BUY with a quote budget can only spend that budget.
                // Find the largest affordable quantity at the current ask.
                if (
                    order.type === "MARKET" &&
                    remainingQuoteAmount !== undefined
                ) {
                    let low = 0;
                    let high = tradeQuantity;

                    while (low < high) {
                        const mid = Math.ceil((low + high) / 2);
                        const quoteAmount = unitsToAmount(
                            "USDT",
                            calculateQuoteAmount(matchedOrder.price, mid),
                        );

                        if (quoteAmount <= remainingQuoteAmount) {
                            low = mid;
                        } else {
                            high = mid - 1;
                        }
                    }

                    tradeQuantity = low;
                    if (tradeQuantity === 0) break;

                    const quoteAmount = unitsToAmount(
                        "USDT",
                        calculateQuoteAmount(matchedOrder.price, tradeQuantity),
                    );
                    remainingQuoteAmount -= quoteAmount;
                }

                matchedOrder.quantity -= tradeQuantity;
                remainingQuantity -= tradeQuantity;

                if (matchedOrder.quantity === 0) {
                    bestAsk.orders.shift();
                }

                if (bestAsk.orders.length === 0) {
                    asks?.delete(bestAsk.price);
                }

                if (asks?.size === 0) {
                    this.asks.delete(order.symbol);
                }

                trades.push({
                    id: generateTradeId(),
                    symbol: order.symbol,
                    price: matchedOrder.price,
                    quantity: tradeQuantity,
                    buyOrderId: order.id,
                    sellOrderId: matchedOrder.id,
                    buyAccountId: order.accountId,
                    sellAccountId: matchedOrder.accountId,
                    timestamp: Date.now(),
                });
            }

            return { trades, remainingQuantity };
        }

        // Incoming SELL orders only match BUY orders for the same symbol.
        while (remainingQuantity > 0) {
            const bestBid = this.getBestBid(order.symbol);
            if (!bestBid) break;

            if (order.type === "LIMIT" && order.price > bestBid.price) {
                break;
            }

            const bids = this.bids.get(order.symbol);
            const matchedOrder = bestBid.orders[0];
            if (!matchedOrder) break;

            const tradeQuantity = Math.min(
                remainingQuantity,
                matchedOrder.quantity,
            );

            matchedOrder.quantity -= tradeQuantity;
            remainingQuantity -= tradeQuantity;

            if (matchedOrder.quantity === 0) {
                bestBid.orders.shift();
            }

            if (bestBid.orders.length === 0) {
                bids?.delete(bestBid.price);
            }

            if (bids?.size === 0) {
                this.bids.delete(order.symbol);
            }

            trades.push({
                id: generateTradeId(),
                symbol: order.symbol,
                price: matchedOrder.price,
                quantity: tradeQuantity,
                buyOrderId: matchedOrder.id,
                sellOrderId: order.id,
                buyAccountId: matchedOrder.accountId,
                sellAccountId: order.accountId,
                timestamp: Date.now(),
            });
        }

        return { trades, remainingQuantity };
    }

    placeOrder(order: Order): OrderResult {
        const validateError = validateOrder(order);

        if (validateError) {
            console.log("Order rejected: ", validateError);
            return {
                status: "REJECTED",
                trades: [],
                remainingQuantity: order.quantity,
            };
        }

        const result = this.matchOrder(order);

        if (result.remainingQuantity > 0 && order.type === "LIMIT") {
            this.addOrder({
                ...order,
                quantity: result.remainingQuantity,
            });
        }

        let status: OrderStatus;

        if (result.remainingQuantity > 0 && order.type === "MARKET") {
            status = result.trades.length > 0 ? "PARTIALLY_FILLED" : "CANCELLED";
        } else if (result.trades.length === 0) {
            status = "OPEN";
        } else if (result.remainingQuantity > 0) {
            status = "PARTIALLY_FILLED";
        } else {
            status = "FILLED";
        }

        return {
            status,
            trades: result.trades,
            remainingQuantity: result.remainingQuantity,
        };
    }

    cancelOrder(orderId: string): CancelResult {
        for (const [symbol, book] of this.bids) {
            for (const [price, priceLevel] of book) {
                const orderIndex = priceLevel.orders.findIndex(
                    order => order.id === orderId,
                );
                if (orderIndex === -1) continue;

                const order = priceLevel.orders[orderIndex]!;
                priceLevel.orders.splice(orderIndex, 1);

                if (priceLevel.orders.length === 0) book.delete(price);
                if (book.size === 0) this.bids.delete(symbol);

                return {
                    success: true,
                    orderId,
                    accountId: order.accountId,
                    side: order.side,
                    price: order.price,
                    remainingQuantity: order.quantity,
                };
            }
        }

        for (const [symbol, book] of this.asks) {
            for (const [price, priceLevel] of book) {
                const orderIndex = priceLevel.orders.findIndex(
                    order => order.id === orderId,
                );
                if (orderIndex === -1) continue;

                const order = priceLevel.orders[orderIndex]!;
                priceLevel.orders.splice(orderIndex, 1);

                if (priceLevel.orders.length === 0) book.delete(price);
                if (book.size === 0) this.asks.delete(symbol);

                return {
                    success: true,
                    orderId,
                    accountId: order.accountId,
                    side: order.side,
                    price: order.price,
                    remainingQuantity: order.quantity,
                };
            }
        }

        return {
            success: false,
            orderId,
            remainingQuantity: 0,
        };
    }
}
