
import {  test, expect } from "bun:test";
import { sql } from "./client";
import { PostgresPersistence } from "./postgres_persistence";
import type { OrderExecutionCommit } from "./persistence.types";

const persistence = new PostgresPersistence();

const suffix = `${Date.now()}`;
const buyerId = `test-buyer-${suffix}`;
const sellerId = `test-seller-${suffix}`;
const missingAccountId = `missing-account-${suffix}`;
const newOrderId = `test-buy-order-${suffix}`;
const restingOrderId = `test-sell-order-${suffix}`;
const tradeId = `test-trade-${suffix}`;


test("rolls back all writes when a balance update fails", async () => {
    await sql`
        INSERT INTO accounts (id)
        VALUES (${buyerId}), (${sellerId})
    `;

    await sql`
        INSERT INTO orders (
            id, account_id, symbol, side, type, price,
            original_quantity, remaining_quantity,
            status, timestamp_ms
        )
        VALUES (
            ${restingOrderId}, ${sellerId}, 'BTCUSDT',
            'SELL', 'LIMIT', 100,
            2, 2, 'OPEN', ${Date.now()}
        )
    `;

    const execution: OrderExecutionCommit = {
        newOrder: {
            order: {
                id: newOrderId,
                accountId: buyerId,
                symbol: "BTCUSDT",
                side: "BUY",
                type: "LIMIT",
                price: 100,
                quantity: 1,
                timestamp: Date.now(),
            },
            status: "FILLED",
            remainingQuantity: 0,
        },
        updatedOrders: [
            {
                orderId: restingOrderId,
                status: "PARTIALLY_FILLED",
                remainingQuantity: 1,
            },
        ],
        trades: [
            {
                id: tradeId,
                symbol: "BTCUSDT",
                price: 100,
                quantity: 1,
                buyOrderId: newOrderId,
                sellOrderId: restingOrderId,
                buyAccountId: buyerId,
                sellAccountId: sellerId,
                timestamp: Date.now(),
            },
        ],
        balances: [
            {
                accountId: missingAccountId,
                asset: "USDT",
                available: 100,
                locked: 0,
            },
        ],
    };

    try {
        await expect(
            persistence.commitOrderExecution(execution)
        ).rejects.toThrow();

        const newOrder = await sql`
            SELECT id FROM orders
            WHERE id = ${newOrderId}
        `;

        const restingOrder = await sql`
            SELECT status, remaining_quantity
            FROM orders
            WHERE id = ${restingOrderId}
        `;

        const trades = await sql`
            SELECT id FROM trades
            WHERE id = ${tradeId}
        `;

        expect(newOrder.length).toBe(0);
        expect(trades.length).toBe(0);
        expect(restingOrder[0]?.status).toBe("OPEN");
        expect(Number(restingOrder[0]?.remaining_quantity)).toBe(2);
    } finally {
        await sql`DELETE FROM trades WHERE id = ${tradeId}`;
        await sql`DELETE FROM orders WHERE id = ${newOrderId}`;
        await sql`DELETE FROM orders WHERE id = ${restingOrderId}`;
        await sql`DELETE FROM accounts WHERE id = ${buyerId}`;
        await sql`DELETE FROM accounts WHERE id = ${sellerId}`;
    }
});




test("persists an order execution successfully", async () => {
    const buyerId = `success-buyer-${Date.now()}`;
    const sellerId = `success-seller-${Date.now()}`;
    const newOrderId = `success-buy-${Date.now()}`;
    const restingOrderId = `success-sell-${Date.now()}`;
    const tradeId = `success-trade-${Date.now()}`;

    try {
        await sql`
            INSERT INTO accounts (id)
            VALUES (${buyerId}), (${sellerId})
        `;

        await sql`
            INSERT INTO orders (
                id, account_id, symbol, side, type, price,
                original_quantity, remaining_quantity,
                status, timestamp_ms
            )
            VALUES (
                ${restingOrderId}, ${sellerId}, 'BTCUSDT',
                'SELL', 'LIMIT', 100,
                2, 2, 'OPEN', ${Date.now()}
            )
        `;

        await persistence.commitOrderExecution({
            newOrder: {
                order: {
                    id: newOrderId,
                    accountId: buyerId,
                    symbol: "BTCUSDT",
                    side: "BUY",
                    type: "LIMIT",
                    price: 100,
                    quantity: 1,
                    timestamp: Date.now(),
                },
                status: "FILLED",
                remainingQuantity: 0,
            },
            updatedOrders: [
                {
                    orderId: restingOrderId,
                    status: "PARTIALLY_FILLED",
                    remainingQuantity: 1,
                },
            ],
            trades: [
                {
                    id: tradeId,
                    symbol: "BTCUSDT",
                    price: 100,
                    quantity: 1,
                    buyOrderId: newOrderId,
                    sellOrderId: restingOrderId,
                    buyAccountId: buyerId,
                    sellAccountId: sellerId,
                    timestamp: Date.now(),
                },
            ],
            balances: [
                {
                    accountId: buyerId,
                    asset: "USDT",
                    available: 900,
                    locked: 100,
                },
            ],
        });

        const orders = await sql`
            SELECT status, remaining_quantity
            FROM orders WHERE id = ${newOrderId}
        `;

        const restingOrders = await sql`
            SELECT status, remaining_quantity
            FROM orders WHERE id = ${restingOrderId}
        `;

        const trades = await sql`
            SELECT quantity FROM trades WHERE id = ${tradeId}
        `;

        const balances = await sql`
            SELECT available, locked
            FROM balances
            WHERE account_id = ${buyerId} AND asset = 'USDT'
        `;

        expect(orders.length).toBe(1);
        expect(orders[0]?.status).toBe("FILLED");
        expect(Number(orders[0]?.remaining_quantity)).toBe(0);

        expect(restingOrders[0]?.status).toBe("PARTIALLY_FILLED");
        expect(Number(restingOrders[0]?.remaining_quantity)).toBe(1);

        expect(trades.length).toBe(1);
        expect(Number(trades[0]?.quantity)).toBe(1);

        expect(Number(balances[0]?.available)).toBe(900);
        expect(Number(balances[0]?.locked)).toBe(100);
    } finally {
        await sql`DELETE FROM trades WHERE id = ${tradeId}`;
        await sql`DELETE FROM orders WHERE id = ${newOrderId}`;
        await sql`DELETE FROM orders WHERE id = ${restingOrderId}`;
        await sql`DELETE FROM balances WHERE account_id = ${buyerId}`;
        await sql`DELETE FROM accounts WHERE id = ${buyerId}`;
        await sql`DELETE FROM accounts WHERE id = ${sellerId}`;
    }
});



test("persists an account successfully", async () => {
    const accountId = `account-${crypto.randomUUID()}`;

    await persistence.createAccount(accountId);

    const accounts = await sql`
        SELECT id
        FROM accounts
        WHERE id = ${accountId}
    `;

    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.id).toBe(accountId);

    await sql`
        DELETE FROM accounts
        WHERE id = ${accountId}
    `;
});
