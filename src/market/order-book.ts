import { calculateQuoteAmount, unitsToAmount } from "../account/asset";
import type { CancelResult, ExecuteTrade, MatchResult, Order , OrderBook as OrderBookType, OrderResult, OrderStatus, PriceLevel } from "../types/order";
import { validateOrder } from "./order_validation";
import { generateTradeId } from "./trade_id";

export class OrderBook {
    private bids : Map<number,PriceLevel> = new Map();
    private asks : Map<number, PriceLevel> = new Map();

    addOrder (order : Order): void{
        const book = order.side === "BUY"
            ? this.bids : this.asks

            const priceLevel = book.get(order.price);
            
            if (priceLevel) {
                priceLevel.orders.push(order)
                return
            }
            book.set(order.price,{
                price:order.price,
                orders:[order]
            })
        }

    getBook() : OrderBookType {
        return {
           bids: this.bids,
           asks: this.asks
        }
    }

    getBestBid(): PriceLevel | undefined {
        let bestBid: PriceLevel | undefined;

        for (const priceLevel of this.bids.values()) {
            if (!bestBid || priceLevel.price > bestBid.price) {
                bestBid = priceLevel;
            }
        }

        return bestBid;
    }

    getBestAsk(): PriceLevel | undefined {
        let bestAsk: PriceLevel | undefined;
        for(const priceLevel of this.asks.values()){
            if(!bestAsk || priceLevel.price < bestAsk.price){
            bestAsk = priceLevel
        }
        }
        return bestAsk
    }
    
    matchOrder(order: Order): MatchResult {
    const trades: ExecuteTrade[] = [];

    let remainingQuantity = order.quantity;

    if (order.side === "BUY") {

        // Incoming order is BUY.
        // Therefore, we look for a SELL order.

        let remainingQuoteAmount = order.maxQuoteAmount;

        while (remainingQuantity > 0) {

            const bestAsk = this.getBestAsk();

            if (!bestAsk) {
                break;
            }

            // BUY price must be >= SELL price
            if (
                order.type === "LIMIT" &&
                order.price < bestAsk.price
            ) {
                break;
            }

            const matchedOrder = bestAsk.orders[0];

            if (!matchedOrder) {
                break;
            }

            const tradeQuantity = Math.min(
                remainingQuantity,
                matchedOrder.quantity
            );

            // MARKET BUY must not spend more than maxQuoteAmount
            if (
                order.type === "MARKET" &&
                remainingQuoteAmount !== undefined
            ) {
                const quoteAmount = unitsToAmount(
                    "USDT",
                    calculateQuoteAmount(
                        matchedOrder.price,
                        tradeQuantity
                    )
                );

                if (quoteAmount > remainingQuoteAmount) {
                    break;
                }

                remainingQuoteAmount -= quoteAmount;
            }

            matchedOrder.quantity -= tradeQuantity;
            remainingQuantity -= tradeQuantity;

            // SELL order completely filled
            if (matchedOrder.quantity === 0) {
                bestAsk.orders.shift();
            }

            // No SELL orders left at this price
            if (bestAsk.orders.length === 0) {
                this.asks.delete(bestAsk.price);
            }

            const trade: ExecuteTrade = {
                id: generateTradeId(),
                symbol: order.symbol,
                price: matchedOrder.price,
                quantity: tradeQuantity,
                buyOrderId: order.id,
                sellOrderId: matchedOrder.id,
                buyAccountId: order.accountId,
                sellAccountId: matchedOrder.accountId,
                timestamp: Date.now()
            };

            trades.push(trade);
        }

        return {
            trades,
            remainingQuantity
        };
    }

    // Incoming order is SELL.
    // Therefore, we look for a BUY order.

    while (remainingQuantity > 0) {

        const bestBid = this.getBestBid();

        if (!bestBid) {
            break;
        }

        // SELL price must be <= BUY price
        if (
            order.type === "LIMIT" &&
            order.price > bestBid.price
        ) {
            break;
        }

        const matchedOrder = bestBid.orders[0];

        if (!matchedOrder) {
            break;
        }

        const tradeQuantity = Math.min(
            remainingQuantity,
            matchedOrder.quantity
        );

        matchedOrder.quantity -= tradeQuantity;
        remainingQuantity -= tradeQuantity;

        // BUY order completely filled
        if (matchedOrder.quantity === 0) {
            bestBid.orders.shift();
        }

        // No BUY orders left at this price
        if (bestBid.orders.length === 0) {
            this.bids.delete(bestBid.price);
        }

        const trade: ExecuteTrade = {
            id: generateTradeId(),
            symbol: order.symbol,
            price: matchedOrder.price,
            quantity: tradeQuantity,
            buyOrderId: matchedOrder.id,
            sellOrderId: order.id,
            buyAccountId: matchedOrder.accountId,
            sellAccountId: order.accountId,
            timestamp: Date.now()
        };

        trades.push(trade);
    }

    return {
        trades,
        remainingQuantity
    };
}

    placeOrder (order: Order) : OrderResult {
        const validateError = validateOrder(order);

        if(validateError){
            console.log("Order rejected: ", validateError);
            return {
                status: "REJECTED",
                trades: [],
                remainingQuantity: order.quantity
            };
        }
        const result = this.matchOrder(order)

        if(result.remainingQuantity > 0 && order.type === "LIMIT"){
            this.addOrder({
                ...order,
                quantity: result.remainingQuantity
            })
        }

        let status: OrderStatus;

        if (result.remainingQuantity > 0 && order.type === "MARKET") {
            status = result.trades.length > 0
                ? "PARTIALLY_FILLED"
                : "CANCELLED";
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
            remainingQuantity: result.remainingQuantity
        };
    }


    cancelOrder(orderId: string): CancelResult {

        for (const [price, priceLevel] of this.bids) {

            const orderIndex = priceLevel.orders.findIndex(
                order => order.id === orderId
            );

            if (orderIndex !== -1) {

                const order = priceLevel.orders[orderIndex]!;

                priceLevel.orders.splice(orderIndex, 1);

                if (priceLevel.orders.length === 0) {
                    this.bids.delete(price);
                }

                return {
                    success: true,
                    orderId: orderId,
                    accountId: order.accountId,
                    side: order.side,
                    price: order.price,
                    remainingQuantity: order.quantity
                };
            }
        }

        for (const [price, priceLevel] of this.asks) {

            const orderIndex = priceLevel.orders.findIndex(
                order => order.id === orderId
            );

            if (orderIndex !== -1) {

                const order = priceLevel.orders[orderIndex]!;

                priceLevel.orders.splice(orderIndex, 1);

                if (priceLevel.orders.length === 0) {
                    this.asks.delete(price);
                }

                return {
                    success: true,
                    orderId: orderId,
                    accountId: order.accountId,
                    side: order.side,
                    price: order.price,
                    remainingQuantity: order.quantity
                };
            }
        }

        return {
            success: false,
            orderId: orderId,
            remainingQuantity: 0
        };
    }

    
}