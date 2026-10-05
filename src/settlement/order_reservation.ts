import type { Order } from "../types/order";
import { AccountManager } from "../account/account";
import {
    calculateQuoteAmount,
    unitsToAmount
} from "../account/asset";

export class OrderReservation {
    constructor(
        private accountManager: AccountManager
    ) {}

    reserve(order: Order): void {
        if (order.side === "BUY") {
            const quoteUnits = calculateQuoteAmount(
                order.price,
                order.quantity
            );

            const quoteAmount = unitsToAmount(
                "USDT",
                quoteUnits
            );

            this.accountManager.lockBalance(
                order.accountId,
                "USDT",
                quoteAmount
            );

            return;
        }

        const quantity = unitsToAmount(
            "BTC",
            order.quantity
        );

        this.accountManager.lockBalance(
            order.accountId,
            "BTC",
            quantity
        );
    }

    releaseExcessBuyReservation(
        order: Order,
        tradePrice: number,
        tradeQuantity: number
    ): void {
        if (order.side !== "BUY") {
            return;
        }

        const reservedUnits = calculateQuoteAmount(
            order.price,
            tradeQuantity
        );

        const actualUnits = calculateQuoteAmount(
            tradePrice,
            tradeQuantity
        );

        const excessUnits =
            reservedUnits - actualUnits;

        if (excessUnits <= 0) {
            return;
        }

        const excessAmount = unitsToAmount(
            "USDT",
            excessUnits
        );

        this.accountManager.unlockBalance(
            order.accountId,
            "USDT",
            excessAmount
        );
    }
}