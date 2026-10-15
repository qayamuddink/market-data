
import type { AccountManager } from "../account/account";
import {
    amountToUnits,
    calculateQuoteAmount,
    unitsToAmount
} from "../account/asset";
import type { ExecuteTrade } from "../types/order";

export class Settlement {
    constructor(
        private accountManager: AccountManager
    ) {}

    settle(trade: ExecuteTrade): void {
        const buyer = this.accountManager.getAccount(
            trade.buyAccountId
        );

        const seller = this.accountManager.getAccount(
            trade.sellAccountId
        );

        if (!buyer || !seller) {
            throw new Error("Buyer or seller account not found");
        }

        const btcAmount = unitsToAmount(
            "BTC",
            trade.quantity
        );

        const usdtUnits = calculateQuoteAmount(
            trade.price,
            trade.quantity
        );

        const usdtAmount = unitsToAmount(
            "USDT",
            usdtUnits
        );

        const requiredUsdtUnits = amountToUnits(
            "USDT",
            usdtAmount
        );

        const requiredBtcUnits = amountToUnits(
            "BTC",
            btcAmount
        );

        const buyerUsdt = buyer.balances.get("USDT");
        const sellerBtc = seller.balances.get("BTC");

        if (
            !buyerUsdt ||
            buyerUsdt.locked < requiredUsdtUnits
        ) {
            throw new Error(
                "Insufficient locked USDT for settlement"
            );
        }

        if (
            !sellerBtc ||
            sellerBtc.locked < requiredBtcUnits
        ) {
            throw new Error(
                "Insufficient locked BTC for settlement"
            );
        }

        // All preconditions are checked before any mutation.
        this.accountManager.deductBalance(
            trade.buyAccountId,
            "USDT",
            usdtAmount
        );

        this.accountManager.deductBalance(
            trade.sellAccountId,
            "BTC",
            btcAmount
        );

        this.accountManager.creditBalance(
            trade.buyAccountId,
            "BTC",
            btcAmount
        );

        this.accountManager.creditBalance(
            trade.sellAccountId,
            "USDT",
            usdtAmount
        );
    }
}
