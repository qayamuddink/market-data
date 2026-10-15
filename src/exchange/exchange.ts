import { AccountManager } from "../account/account";
import { calculateQuoteAmount, unitsToAmount } from "../account/asset";
import type { AccountPersistence } from "../database/persistence.types";
import { EventBus } from "../events/event_bus";
import { MarketData } from "../market/market_data";
import { OrderBook } from "../market/order-book";
import { validateOrder } from "../market/order_validation";
import { OrderReservation } from "../settlement/order_reservation";
import { Settlement } from "../settlement/settlement";
import type { Order, OrderResult } from "../types/order";
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
        persistence: AccountPersistence | null = null,
    ) {
        this.orderBook = new OrderBook();
        this.accountManager = new AccountManager();
        this.orderReservation = new OrderReservation(this.accountManager);
        this.settlement = new Settlement(this.accountManager);
        this.orderManager = new OrderManager();
        this.eventBus = eventBus;
        this.marketData = new MarketData();
        this.persistence = persistence;

        this.eventBus.subscribe(event => {
            if (event.type === "TradeExecuted") {
                this.marketData.addTrade(event.trade);
            }
        });
    }

    async createAccount(accountId: string): Promise<void> {
        if (this.accountManager.getAccount(accountId)) {
            throw new Error("Account already exists");
        }

        if (this.persistence) {
            await this.persistence.createAccount(accountId);
        }

        this.accountManager.createAccount(accountId);
    }

    async restoreAccounts(): Promise<void> {
        if (!this.persistence) return;

        const accountIds = await this.persistence.getAccountIds();
        const balances = await this.persistence.getBalances();

        for (const accountId of accountIds) {
            this.accountManager.restoreAccount({
                id: accountId,
                balances: new Map(),
            });
        }

        for (const balance of balances) {
            this.accountManager.restoreBalance(
                balance.accountId,
                balance.asset as "BTC" | "USDT",
                balance.available,
                balance.locked,
            );
        }
    }

    addBalance(accountId: string, asset: "BTC" | "USDT", amount: number): void {
        this.accountManager.addBalance(accountId, asset, amount);
    }

    private publishOrderUpdated(orderId: string): void {
        const order = this.orderManager.getOrder(orderId);
        if (!order) throw new Error("Order not found");

        this.eventBus.publish({
            type: "OrderUpdated",
            order: {
                id: order.order.id,
                accountId: order.order.accountId,
                symbol: order.order.symbol,
                status: order.status,
                originalQuantity: order.originalQuantity,
                filledQuantity: order.filledQuantity,
                quoteSpent: order.quoteSpent,
            },
        });
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

        this.eventBus.publish({
            type: "OrderBookUpdated",
            symbol: order.symbol,
            orderBook: this.orderBook.getBook(order.symbol),
        });

        for (const trade of result.trades) {
            this.settlement.settle(trade);

            this.eventBus.publish({
                type: "TradeExecuted",
                trade,
            });

            const quoteUnits = calculateQuoteAmount(trade.price, trade.quantity);
            const quoteAmount = unitsToAmount("USDT", quoteUnits);
            this.orderManager.addQuoteSpent(trade.buyOrderId, quoteAmount);

            const buyOrder = this.orderManager.getOrderData(trade.buyOrderId);
            if (!buyOrder) throw new Error("Buy order not found");

            this.orderReservation.releaseLimitBuyPriceImprovement(
                buyOrder,
                trade.quantity,
                trade.price,
            );

            this.orderManager.processTrades(trade.buyOrderId, trade.quantity);
            this.orderManager.processTrades(trade.sellOrderId, trade.quantity);

            this.publishOrderUpdated(trade.buyOrderId);
            this.publishOrderUpdated(trade.sellOrderId);
        }

        if (result.trades.length > 0) {
            const lastTrade = result.trades[result.trades.length - 1]!;
            const bestBid = this.getBestBid(order.symbol);
            const bestAsk = this.getBestAsk(order.symbol);

            this.eventBus.publish({
                type: "TickerUpdated",
                symbol: order.symbol,
                lastPrice: lastTrade.price,
                bestBid: bestBid?.price,
                bestAsk: bestAsk?.price,
            });
        }

        // Refund unused quote budget once, after all MARKET BUY fills are known.
        if (
            order.type === "MARKET" &&
            order.side === "BUY" &&
            result.trades.length > 0
        ) {
            const managedBuyOrder = this.orderManager.getOrder(order.id);
            if (!managedBuyOrder) throw new Error("Buy order not found");

            this.orderReservation.releaseExcessBuyReservation(
                order,
                managedBuyOrder.quoteSpent,
            );
        }

        // Release reservations for any unfilled remainder of a MARKET order.
        if (order.type === "MARKET" && result.remainingQuantity > 0) {
            if (
                order.side === "BUY" &&
                order.maxQuoteAmount !== undefined &&
                result.trades.length === 0
            ) {
                this.accountManager.unlockBalance(
                    order.accountId,
                    "USDT",
                    order.maxQuoteAmount,
                );
            }

            if (order.side === "SELL") {
                const remainingQuantity = unitsToAmount(
                    "BTC",
                    result.remainingQuantity,
                );

                this.accountManager.unlockBalance(
                    order.accountId,
                    "BTC",
                    remainingQuantity,
                );
            }
        }

        return result;
    }

    cancelOrder(orderId: string) {
        const result = this.orderBook.cancelOrder(orderId);
        if (!result.success) return result;

        if (result.side === "BUY") {
            const quoteUnits = calculateQuoteAmount(
                result.price!,
                result.remainingQuantity,
            );
            const usdtAmount = unitsToAmount("USDT", quoteUnits);
            this.accountManager.unlockBalance(result.accountId!, "USDT", usdtAmount);
        } else {
            const btcAmount = unitsToAmount("BTC", result.remainingQuantity);
            this.accountManager.unlockBalance(result.accountId!, "BTC", btcAmount);
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
        return this.accountManager.getAccount(accountId);
    }

    getOrderBook(symbol?: string) {
        return this.orderBook.getBook(symbol);
    }

    getBestBid(symbol?: string) {
        return this.orderBook.getBestBid(symbol);
    }

    getBestAsk(symbol?: string) {
        return this.orderBook.getBestAsk(symbol);
    }

    getMarketData(): MarketData {
        return this.marketData;
    }
}
