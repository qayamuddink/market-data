import type { OrderResult } from "../types/order"
import { unitsToQuantity } from "./precision";
import { formatTrade } from "./trade_formatter"


export type FormattedOrderResult = {
    status: OrderResult["status"];
    trades: ReturnType<typeof formatTrade>[];
    remainingQuantity: number;
}


export function FormatOrderResult (
    result: OrderResult
) : FormattedOrderResult {
    return {
        status: result.status,
        trades: result.trades.map(formatTrade),
        remainingQuantity:unitsToQuantity(result.remainingQuantity)
    }
}