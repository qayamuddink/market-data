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
        if (
            order.type === "MARKET" &&
            order.maxQuoteAmount !== undefined
        ) {
            this.accountManager.lockBalance(
                order.accountId,
                "USDT",
                order.maxQuoteAmount
            );

            return;
        }

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


releaseLimitBuyPriceImprovement(
    order: Order,
    quantity: number,
    executionPrice: number
): void {
    if (order.side !== "BUY" || order.type !== "LIMIT") {
        return;
    }

    const reservedUnits = calculateQuoteAmount(
        order.price,
        quantity
    );

    const actualUnits = calculateQuoteAmount(
        executionPrice,
        quantity
    );

    const excessUnits = reservedUnits - actualUnits;

    if (excessUnits <= 0) {
        return;
    }

    const excessAmount = unitsToAmount("USDT", excessUnits);

    this.accountManager.unlockBalance(
        order.accountId,
        "USDT",
        excessAmount
    );
}

releaseExcessBuyReservation(
    order: Order,
    quoteSpent: number
): void {
    if (
        order.side !== "BUY" ||
        order.type !== "MARKET" ||
        order.maxQuoteAmount === undefined
    ) {
        return;
    }

    const excessAmount = order.maxQuoteAmount - quoteSpent;

    if (excessAmount <= 0) {
        return;
    }

    this.accountManager.unlockBalance(
        order.accountId,
        "USDT",
        excessAmount
    );
}

  
}