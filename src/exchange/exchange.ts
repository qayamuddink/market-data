import { AccountManager } from "../account/account";
import { calculateQuoteAmount, unitsToAmount } from "../account/asset";
import { OrderBook } from "../market/order-book";
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
    constructor(){
        this.orderBook = new OrderBook();
        this.accountManager = new AccountManager()
        this.orderReservation = new OrderReservation(
            this.accountManager
        );
        this.settlement = new Settlement(
            this.accountManager
        );

        this.orderManager = new OrderManager();
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

    placeOrder(order: Order): OrderResult{
        this.orderManager.addOrder(order);

        this.orderReservation.reserve(order);

        const result = this.orderBook.placeOrder(order);

        for(const trade of result.trades) {
            this.settlement.settle(trade);
            this.orderReservation.releaseExcessBuyReservation(
                order,
                trade.price,
                trade.quantity
            );

            this.orderManager.processTrades(trade.buyOrderId, trade.quantity);
            this.orderManager.processTrades(trade.sellOrderId, trade.quantity);
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


    getAccount(accountId: string) {
        return this.accountManager.getAccount(accountId)
    }

    getOrderBook(){
        return this.orderBook.getBook()
    }

}