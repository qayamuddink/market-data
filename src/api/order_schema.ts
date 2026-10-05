import { z } from "zod";

export const orderSchema = z.object({
    id: z.string().min(1),
    accountId: z.string().min(1),
    symbol: z.string().min(1),
    side: z.enum(["BUY", "SELL"]),
    type: z.enum(["LIMIT", "MARKET"]),
    price: z.number().nonnegative(),
    quantity: z.number().positive(),
    maxQuoteAmount: z.number().positive().optional()
});


export const depositSchema = z.object({
    asset: z.enum(["BTC", "USDT"]),
    amount: z.number().positive()
});