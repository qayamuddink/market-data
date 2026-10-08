import { AccountManager } from "../account/account";
import { calculateQuoteAmount, unitsToAmount } from "../account/asset";
import { EventBus } from "../events/event_bus";
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
    private settlement : Settlement;
    private orderManager: OrderManager;
    private eventBus: EventBus;
    constructor(eventBus: EventBus){
        this.orderBook = new OrderBook();
        this.accountManager = new AccountManager()
        this.orderReservation = new OrderReservation(
            this.accountManager
        );
        this.settlement = new Settlement(
            this.accountManager
        );
    

        this.orderManager = new OrderManager();
        this.eventBus = eventBus;

        // this.eventBus.subscribe((event) => {
        //     console.log("Exchange event:", event);
        // })
    }

    createAccount(accountId: string): void {
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
        )
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

    const result = this.orderBook.placeOrder(order);

    for (const trade of result.trades) {

        this.settlement.settle(trade);

        console.log("Publishing tradeExecuted event");


        this.eventBus.publish({
            type: "TradeExecuted",
            trade,

        })

        

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

        this.orderManager.processTrades(
            trade.buyOrderId,
            trade.quantity
        );

        this.orderManager.processTrades(
            trade.sellOrderId,
            trade.quantity
        );
    }

    // Release unused BUY reservation
    // after all trades have been processed.
    if (result.trades.length > 0) {

        const buyOrderId = result.trades[0]!.buyOrderId;

        const buyOrder = this.orderManager.getOrderData(
            buyOrderId
        );

        if (!buyOrder) {
            throw new Error("Buy order not found");
        }

        const managedBuyOrder = this.orderManager.getOrder(
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

    // Release reservation for an unfilled MARKET order.
    //
    // IMPORTANT:
    // If trades already happened, the unused BUY reservation
    // was already released above.
    //
    // Therefore, for MARKET BUY we only unlock the full
    // reservation when NO trade happened.
    if (
        order.type === "MARKET" &&
        result.remainingQuantity > 0
    ) {

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

        if (order.side === "SELL") {

            const remainingQuantity = unitsToAmount(
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

    const result = this.orderBook.cancelOrder(orderId);

    if (!result.success) {
        return result;
    }

    if (result.side === "BUY") {
            const quoteUnits = calculateQuoteAmount(
                result.price!,
                result.remainingQuantity
            );

            const usdtAmount = unitsToAmount(
                "USDT",
                quoteUnits
            );

            this.accountManager.unlockBalance(
                result.accountId!,
                "USDT",
                usdtAmount
            );
        } else {

            const btcAmount = unitsToAmount("BTC" , result.remainingQuantity);

            this.accountManager.unlockBalance(
                result.accountId!,
                "BTC",
                btcAmount
            );
        }

        this.orderManager.cancelOrder(orderId);

        return result;
    }

    getOrder(orderId: string){
        return this.orderManager.getOrder(orderId);
    }

    getOrders() {
            return this.orderManager.getOrders();
    }

    getAccount(accountId: string) {
        return this.accountManager.getAccount(accountId)
    }

    getOrderBook(){
        return this.orderBook.getBook()
    }


}