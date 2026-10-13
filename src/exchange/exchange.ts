import { AccountManager } from "../account/account";
import {
    calculateQuoteAmount,
    unitsToAmount
} from "../account/asset";
import type { AccountPersistence } from "../database/persistence.types";

import { EventBus } from "../events/event_bus";
import { MarketData } from "../market/market_data";
import { OrderBook } from "../market/order-book";
import { validateOrder } from "../market/order_validation";
import { OrderReservation } from "../settlement/order_reservation";
import { Settlement } from "../settlement/settlement";
import type {
    Order,
    OrderResult
} from "../types/order";
import { OrderManager } from "./order_manager";

export class Exchange {
    private orderBook: OrderBook;
    private accountManager: AccountManager;
    private orderReservation: OrderReservation;
    private settlement: Settlement;
    private orderManager: OrderManager;
    private eventBus: EventBus;
    private marketData: MarketData;

    private persistence: AccountPersistence | null;

    constructor(
        eventBus: EventBus,
        persistence: AccountPersistence | null = null
    ) {
        this.orderBook = new OrderBook();
        this.accountManager = new AccountManager();
        this.orderReservation = new OrderReservation(this.accountManager);
        this.settlement = new Settlement(this.accountManager);
        this.orderManager = new OrderManager();
        this.eventBus = eventBus;
        this.marketData = new MarketData();
        this.persistence = persistence;

        this.eventBus.subscribe((event) => {
            if (event.type === "TradeExecuted") {
                this.marketData.addTrade(event.trade);
            }
        });
    }
    async createAccount(accountId: string): Promise<void> {
    if (this.persistence) {
        await this.persistence.createAccount(accountId);
    }

    this.accountManager.createAccount(accountId);
    }

    addBalance(
        accountId: string,
        asset: "BTC" | "USDT",
        amount: number
    ): void {
        this.accountManager.addBalance(
            accountId,
            asset,
            amount
        );
    }

    private publishOrderUpdated(orderId: string): void {
        const order = this.orderManager.getOrder(orderId);

        if (!order) {
            throw new Error("Order not found");
        }

        this.eventBus.publish({
            type: "OrderUpdated",
            order: {
                id: order.order.id,
                accountId: order.order.accountId,
                symbol: order.order.symbol,
                status: order.status,
                originalQuantity: order.originalQuantity,
                filledQuantity: order.filledQuantity,
                quoteSpent: order.quoteSpent
            }
        });
    }

    placeOrder(order: Order): OrderResult {
        const validateError = validateOrder(order);

        if (validateError) {
            console.log("Order rejected: ", validateError);

            return {
                status: "REJECTED",
                trades: [],
                remainingQuantity: order.quantity
            };
        }

        if (this.orderManager.getOrder(order.id)) {
            throw new Error("Order already exists");
        }

        this.orderReservation.reserve(order);

        this.orderManager.addOrder(order);

        this.publishOrderUpdated(order.id);

        const result = this.orderBook.placeOrder(order);

        if (result.status === "CANCELLED") {
            this.orderManager.updateOrderStatus(order.id, "CANCELLED");
        }

        /*
          The order book has now changed.
          Publish the updated order book to subscribers.
         */
        this.eventBus.publish({
            type: "OrderBookUpdated",
            symbol: order.symbol,
            orderBook: this.orderBook.getBook()
        });

        /*
          Process every trade.
         */
        for (const trade of result.trades) {
            /*
              Settle the trade:
             
              BUY  -> receive BTC, spend USDT
              SELL -> receive USDT, spend BTC
             */
            this.settlement.settle(trade);

            /*
              Notify subscribers that a trade happened.
             */

            // this.marketData.addTrade(trade);

            this.eventBus.publish({
                type: "TradeExecuted",
                trade
            });

            

            /*
              Calculate how much USDT was spent
              by the BUY order for this trade.
             */
            const quoteUnits = calculateQuoteAmount(
                trade.price,
                trade.quantity
            );

            const quoteAmount = unitsToAmount(
                "USDT",
                quoteUnits
            );

            this.orderManager.addQuoteSpent(
                trade.buyOrderId,
                quoteAmount
            );

            /*
              Update BUY order filled quantity.
             */
            this.orderManager.processTrades(
                trade.buyOrderId,
                trade.quantity
            );

            /*
              Update SELL order filled quantity.
             */
            this.orderManager.processTrades(
                trade.sellOrderId,
                trade.quantity
            );

            /*
              Notify subscribers that both orders changed.
             */
            this.publishOrderUpdated(
                trade.buyOrderId
            );

            this.publishOrderUpdated(
                trade.sellOrderId
            );
        }

        /*
          Ticker
         
            We only need one ticker update after all
          trades from this order have been processed.
         
          The last trade represents the latest traded price.
         */
        if (result.trades.length > 0) {
            const lastTrade =
                result.trades[result.trades.length - 1]!;

            const bestBid = this.getBestBid();
            const bestAsk = this.getBestAsk();

            this.eventBus.publish({
                type: "TickerUpdated",
                symbol: order.symbol,
                lastPrice: lastTrade.price,
                bestBid: bestBid?.price,
                bestAsk: bestAsk?.price
            });
        }

        /*
          Release unused BUY reservation
          after all trades have been processed.
         */
        if (result.trades.length > 0) {
            const buyOrderId =
                result.trades[0]!.buyOrderId;

            const buyOrder =
                this.orderManager.getOrderData(
                    buyOrderId
                );

            if (!buyOrder) {
                throw new Error("Buy order not found");
            }

            const managedBuyOrder =
                this.orderManager.getOrder(
                    buyOrderId
                );

            if (!managedBuyOrder) {
                throw new Error("Buy order not found");
            }

            this.orderReservation.releaseExcessBuyReservation(
                buyOrder,
                managedBuyOrder.quoteSpent
            );
        }

        /*
         * Release reservation for an unfilled MARKET order.
         
          If trades already happened, the unused BUY
          reservation was already released above.
         
          Therefore, for MARKET BUY we only unlock the
          full reservation when NO trade happened.
         */
        if (
            order.type === "MARKET" &&
            result.remainingQuantity > 0
        ) {
            /*
              MARKET BUY with no trade:
              release the complete maxQuoteAmount.
             */
            if (
                order.side === "BUY" &&
                order.maxQuoteAmount !== undefined &&
                result.trades.length === 0
            ) {
                this.accountManager.unlockBalance(
                   order.accountId,
                    "USDT",
                    order.maxQuoteAmount
                );
            }

            /*
              MARKET SELL with remaining quantity:
              release the remaining BTC reservation.
             */
            if (order.side === "SELL") {
                const remainingQuantity =
                    unitsToAmount(
                        "BTC",
                        result.remainingQuantity
                    );

                this.accountManager.unlockBalance(
                    order.accountId,
                    "BTC",
                    remainingQuantity
                );
            }
        }

        return result;
    }

    cancelOrder(orderId: string) {
        const result =
            this.orderBook.cancelOrder(orderId);

        if (!result.success) {
            return result;
        }

        /*
          BUY order:
          unlock the USDT reserved for the
          remaining quantity.
         */
        if (result.side === "BUY") {
            const quoteUnits =
                calculateQuoteAmount(
                    result.price!,
                    result.remainingQuantity
                );

            const usdtAmount =
                unitsToAmount(
                    "USDT",
                    quoteUnits
                );

            this.accountManager.unlockBalance(
                result.accountId!,
                "USDT",
                usdtAmount
            );
        } else {
            /*
              SELL order:
              unlock the remaining BTC.
             */
            const btcAmount =
                unitsToAmount(
                    "BTC",
                    result.remainingQuantity
                );

            this.accountManager.unlockBalance(
                result.accountId!,
                "BTC",
                btcAmount
            );
        }

        this.orderManager.cancelOrder(orderId);

        this.publishOrderUpdated(orderId);

        return result;
    }

    getOrder(orderId: string) {
        return this.orderManager.getOrder(orderId);
    }

    getOrders() {
        return this.orderManager.getOrders();
    }

    getAccount(accountId: string) {
        return this.accountManager.getAccount(
            accountId
        );
    }

    getOrderBook() {
        return this.orderBook.getBook();
    }

    getBestBid() {
        return this.orderBook.getBestBid();
    }

    getBestAsk() {
        return this.orderBook.getBestAsk();
    }


    getMarketData(): MarketData {
        return this.marketData;
    }
}