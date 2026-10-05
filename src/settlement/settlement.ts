import type { AccountManager } from "../account/account";
import { calculateQuoteAmount, unitsToAmount } from "../account/asset";
import type { ExecuteTrade } from "../types/order";


export class Settlement {
    constructor (
        private accountManager: AccountManager
    ){}

    settle(trade: ExecuteTrade): void {
        const btcAmount = unitsToAmount(
            "BTC",
            trade.quantity
        )

        const usdtUnits = calculateQuoteAmount(
            trade.price,
            trade.quantity
        );

        const usdtAmount = unitsToAmount("USDT" ,usdtUnits);

        // buyer
        this.accountManager.deductBalance(
            trade.buyAccountId,
            "USDT",
            usdtAmount
        );

        this.accountManager.creditBalance(
            trade.buyAccountId,
            "BTC",
            btcAmount
        );

        //sellar


        this.accountManager.deductBalance(
            trade.sellAccountId,
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