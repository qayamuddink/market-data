
import { sql } from "./client";
import type {
    BalanceSnapshot,
    ExchangePersistence,
    OrderExecutionCommit,
} from "./persistence.types";

export class PostgresPersistence implements ExchangePersistence {


    async createAccount(accountId: string): Promise<void> {
        await sql`
            INSERT INTO accounts (id)
            VALUES (${accountId})
        `;
    }


    async getAccountIds(): Promise<string[]> {
        const rows = await sql`
            SELECT id FROM accounts
        `;

        return rows.map(row => row.id as string);
    }


async getBalances(): Promise<BalanceSnapshot[]> {
    const rows = await sql`
        SELECT account_id, asset, available, locked
        FROM balances
    `;

    return rows.map(row => ({
        accountId: row.account_id as string,
        asset: row.asset as string,
        available: Number(row.available),
        locked: Number(row.locked)
    }));
}




    async commitOrderExecution(
        execution: OrderExecutionCommit
    ): Promise<void> {
        await sql.begin(async (tx) => {
            const { order, status, remainingQuantity } =
                execution.newOrder;

            // 1. Insert the incoming order.
            await tx`
                INSERT INTO orders (
                    id,
                    account_id,
                    symbol,
                    side,
                    type,
                    price,
                    original_quantity,
                    remaining_quantity,
                    max_quote_amount,
                    status,
                    timestamp_ms
                )
                VALUES (
                    ${order.id},
                    ${order.accountId},
                    ${order.symbol},
                    ${order.side},
                    ${order.type},
                    ${order.price},
                    ${order.quantity},
                    ${remainingQuantity},
                    ${order.maxQuoteAmount ?? null},
                    ${status},
                    ${order.timestamp}
                )
            `;

            // 2. Update resting orders changed by matching.
            for (const updatedOrder of execution.updatedOrders) {
                const result = await tx`
                    UPDATE orders
                    SET
                        status = ${updatedOrder.status},
                        remaining_quantity =
                            ${updatedOrder.remainingQuantity}
                    WHERE id = ${updatedOrder.orderId}
                `;

                if (result.count !== 1) {
                    throw new Error(
                        `Order not found: ${updatedOrder.orderId}`
                    );
                }
            }

            // 3. Insert executed trades.
            for (const trade of execution.trades) {
                await tx`
                    INSERT INTO trades (
                        id,
                        symbol,
                        price,
                        quantity,
                        buy_order_id,
                        sell_order_id,
                        buy_account_id,
                        sell_account_id,
                        timestamp_ms
                    )
                    VALUES (
                        ${trade.id},
                        ${trade.symbol},
                        ${trade.price},
                        ${trade.quantity},
                        ${trade.buyOrderId},
                        ${trade.sellOrderId},
                        ${trade.buyAccountId},
                        ${trade.sellAccountId},
                        ${trade.timestamp}
                    )
                `;
            }

            // 4. Save the resulting account balances.
            for (const balance of execution.balances) {
                await tx`
                    INSERT INTO balances (
                        account_id,
                        asset,
                        available,
                        locked
                    )
                    VALUES (
                        ${balance.accountId},
                        ${balance.asset},
                        ${balance.available},
                        ${balance.locked}
                    )
                    ON CONFLICT (account_id, asset)
                    DO UPDATE SET
                        available = EXCLUDED.available,
                        locked = EXCLUDED.locked
                `;
            }
        });
    }
}
