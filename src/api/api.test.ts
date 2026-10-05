import { beforeAll, afterAll, test, expect } from "bun:test";
import type { Server } from "node:http";
import { app } from "./server";


let server: Server;
let baseUrl: string;

beforeAll(() => {
    server = app.listen(0);

    const address = server.address();

    if (!address || typeof address === "string") {
        throw new Error("Could not get server address");
    }

    baseUrl = `http://localhost:${address.port}`;
});

afterAll(() => {
    server.close();
});

async function request(
    path: string,
    options?: RequestInit
): Promise<Response> {
    return fetch(`${baseUrl}${path}`, options);
}

async function json(
    path: string,
    options?: RequestInit
): Promise<{
    response: Response;
    body: any;
}> {
    const response = await request(path, options);
    const body = await response.json();

    return {
        response,
        body
    };
}


/* -------------------------------------------------- */
/* ACCOUNTS                                            */
/* -------------------------------------------------- */

test("should create an account", async () => {
    const { response, body } = await json(
        "/accounts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                accountId: "api-account-1"
            })
        }
    );

    expect(response.status).toBe(200);

    expect(body).toEqual({
        id: "api-account-1"
    });
});


test("should deposit USDT into an account", async () => {
    const { response, body } = await json(
        "/accounts/api-account-1/deposit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "USDT",
                amount: 1000
            })
        }
    );

    expect(response.status).toBe(200);

    expect(body).toEqual({
        accountId: "api-account-1",
        asset: "USDT",
        amount: 1000
    });
});


test("should get account balance", async () => {
    const { response, body } = await json(
        "/accounts/api-account-1"
    );

    expect(response.status).toBe(200);

    expect(body.id).toBe("api-account-1");
    expect(body.balances.USDT.available).toBe(1000);
    expect(body.balances.USDT.locked).toBe(0);
});


test("should return 404 for unknown account", async () => {
    const { response, body } = await json(
        "/accounts/does-not-exist"
    );

    expect(response.status).toBe(404);
    expect(body.error).toBe("Account not found");
});


/* -------------------------------------------------- */
/* DEPOSIT VALIDATION                                  */
/* -------------------------------------------------- */

test("should reject invalid deposit asset", async () => {
    const { response, body } = await json(
        "/accounts/api-account-1/deposit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "DOGE",
                amount: 100
            })
        }
    );

    expect(response.status).toBe(400);

    expect(body.error).toBe("Validation failed");
    expect(body.details[0].field).toBe("asset");
});


test("should reject invalid deposit amount", async () => {
    const { response, body } = await json(
        "/accounts/api-account-1/deposit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "USDT",
                amount: -100
            })
        }
    );

    expect(response.status).toBe(400);

    expect(body.error).toBe("Validation failed");
    expect(body.details[0].field).toBe("amount");
});


/* -------------------------------------------------- */
/* LIMIT ORDER                                         */
/* -------------------------------------------------- */

test("should create an open LIMIT BUY order", async () => {
    const { response, body } = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: "api-limit-buy-1",
                accountId: "api-account-1",
                symbol: "BTCUSDT",
                side: "BUY",
                type: "LIMIT",
                price: 85000,
                quantity: 0.01
            })
        }
    );

    expect(response.status).toBe(200);

    expect(body.status).toBe("OPEN");
    expect(body.trades).toHaveLength(0);
    expect(body.remainingQuantity).toBe(0.01);
});


test("should get an order by ID", async () => {
    const { response, body } = await json(
        "/orders/api-limit-buy-1"
    );

    expect(response.status).toBe(200);

    expect(body.id).toBe("api-limit-buy-1");
    expect(body.accountId).toBe("api-account-1");
    expect(body.symbol).toBe("BTCUSDT");
    expect(body.side).toBe("BUY");
    expect(body.type).toBe("LIMIT");
    expect(body.price).toBe(85000);
    expect(body.quantity).toBe(0.01);
    expect(body.status).toBe("OPEN");
    expect(body.originalQuantity).toBe(0.01);
    expect(body.filledQuantity).toBe(0);
});


test("should get all orders", async () => {
    const { response, body } = await json(
        "/orders"
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    const order = body.find(
        (order: { id: string }) =>
            order.id === "api-limit-buy-1"
    );

    expect(order).toBeDefined();
});


/* -------------------------------------------------- */
/* ORDER BOOK                                          */
/* -------------------------------------------------- */

test("should get the current order book", async () => {
    const { response, body } = await json(
        "/orderbook"
    );

    expect(response.status).toBe(200);

    expect(body.bids).toBeArray();
    expect(body.asks).toBeArray();

    const bid = body.bids.find(
        (level: { price: number }) =>
            level.price === 85000
    );

    expect(bid).toBeDefined();

    expect(bid.orders[0].id).toBe(
        "api-limit-buy-1"
    );

    expect(bid.orders[0].quantity).toBe(0.01);
});


/* -------------------------------------------------- */
/* MATCHING                                            */
/* -------------------------------------------------- */

test("should match BUY and SELL orders through API", async () => {

    const createAccountResponse = await json(
        "/accounts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                accountId: "api-seller-1"
            })
        }
    );

    expect(createAccountResponse.response.status).toBe(200);

    const depositResponse = await json(
        "/accounts/api-seller-1/deposit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "BTC",
                amount: 0.01
            })
        }
    );

    expect(depositResponse.response.status).toBe(200);

    const { response, body } = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: "api-limit-sell-1",
                accountId: "api-seller-1",
                symbol: "BTCUSDT",
                side: "SELL",
                type: "LIMIT",
                price: 85000,
                quantity: 0.01
            })
        }
    );

    expect(response.status).toBe(200);

    expect(body.status).toBe("FILLED");
    expect(body.trades).toHaveLength(1);
    expect(body.trades[0].price).toBe(85000);
    expect(body.trades[0].quantity).toBe(0.01);
    expect(body.remainingQuantity).toBe(0);
});


/* -------------------------------------------------- */
/* CANCEL ORDER                                        */
/* -------------------------------------------------- */

test("should cancel an open order", async () => {

    const createAccountResponse = await json(
        "/accounts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                accountId: "api-cancel-buyer"
            })
        }
    );

    expect(createAccountResponse.response.status).toBe(200);

    const depositResponse = await json(
        "/accounts/api-cancel-buyer/deposit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "USDT",
                amount: 1000
            })
        }
    );

    expect(depositResponse.response.status).toBe(200);

    const orderResponse = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: "api-cancel-order-1",
                accountId: "api-cancel-buyer",
                symbol: "BTCUSDT",
                side: "BUY",
                type: "LIMIT",
                price: 80000,
                quantity: 0.01
            })
        }
    );

    expect(orderResponse.response.status).toBe(200);
    expect(orderResponse.body.status).toBe("OPEN");

    const { response, body } = await json(
        "/orders/api-cancel-order-1",
        {
            method: "DELETE"
        }
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.orderId).toBe("api-cancel-order-1");
});


test("should return 404 when cancelling unknown order", async () => {
    const { response, body } = await json(
        "/orders/unknown-order",
        {
            method: "DELETE"
        }
    );

    expect(response.status).toBe(404);
    expect(body.error).toBe("order not found");
});


/* -------------------------------------------------- */
/* ORDER VALIDATION                                    */
/* -------------------------------------------------- */

test("should reject invalid order quantity", async () => {
    const { response, body } = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: "invalid-order-1",
                accountId: "api-account-1",
                symbol: "BTCUSDT",
                side: "BUY",
                type: "LIMIT",
                price: 85000,
                quantity: -0.01
            })
        }
    );

    expect(response.status).toBe(400);

    expect(body.error).toBe("Validation failed");
    expect(body.details[0].field).toBe("quantity");
});


test("should reject invalid order side", async () => {
    const { response, body } = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: "invalid-order-2",
                accountId: "api-account-1",
                symbol: "BTCUSDT",
                side: "INVALID",
                type: "LIMIT",
                price: 85000,
                quantity: 0.01
            })
        }
    );

    expect(response.status).toBe(400);

    expect(body.error).toBe("Validation failed");
    expect(body.details[0].field).toBe("side");
});


/* -------------------------------------------------- */
/* INSUFFICIENT BALANCE                                */
/* -------------------------------------------------- */

test("should reject order when account has insufficient balance", async () => {

    const createAccountResponse = await json(
        "/accounts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                accountId: "api-poor-buyer"
            })
        }
    );

    expect(createAccountResponse.response.status).toBe(200);

    const depositResponse = await json(
        "/accounts/api-poor-buyer/deposit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "USDT",
                amount: 100
            })
        }
    );

    expect(depositResponse.response.status).toBe(200);

    const { response, body } = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: "api-insufficient-order",
                accountId: "api-poor-buyer",
                symbol: "BTCUSDT",
                side: "BUY",
                type: "LIMIT",
                price: 85000,
                quantity: 0.01
            })
        }
    );

    expect(response.status).toBe(400);
    expect(body.error).toBe("Insufficient balance");
});


/* -------------------------------------------------- */
/* DUPLICATES                                          */
/* -------------------------------------------------- */

test("should reject duplicate account", async () => {

    const first = await json(
        "/accounts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                accountId: "api-duplicate-account"
            })
        }
    );

    expect(first.response.status).toBe(200);

    const second = await json(
        "/accounts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                accountId: "api-duplicate-account"
            })
        }
    );

    expect(second.response.status).toBe(400);
    expect(second.body.error).toBe("Account already exists");
});


test("should reject duplicate order", async () => {

    const createAccountResponse = await json(
        "/accounts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                accountId: "api-duplicate-order"
            })
        }
    );

    expect(createAccountResponse.response.status).toBe(200);

    const depositResponse = await json(
        "/accounts/api-duplicate-order/deposit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "USDT",
                amount: 2000
            })
        }
    );

    expect(depositResponse.response.status).toBe(200);

    const order = {
        id: "api-duplicate-order-1",
        accountId: "api-duplicate-order",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "LIMIT",
        price: 85000,
        quantity: 0.01
    };

    const first = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(order)
        }
    );

    expect(first.response.status).toBe(200);

    const second = await json(
        "/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(order)
        }
    );

    expect(second.response.status).toBe(400);
    expect(second.body.error).toBe("Order already exists");
});