const baseUrl = "http://localhost:3000";

async function request(
    path: string,
    options?: RequestInit
) {
    const response = await fetch(
        `${baseUrl}${path}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers
            }
        }
    );

    const data = await response.json();

    console.log(
        `${options?.method ?? "GET"} ${path}`,
        response.status,
        data
    );

    return data;
}

async function main() {
    // Create accounts

    await request("/accounts", {
        method: "POST",
        body: JSON.stringify({
            accountId: "ticker-buyer"
        })
    });

    await request("/accounts", {
        method: "POST",
        body: JSON.stringify({
            accountId: "ticker-seller"
        })
    });

    // Deposit balances

    await request("/accounts/ticker-buyer/deposit", {
        method: "POST",
        body: JSON.stringify({
            asset: "USDT",
            amount: 10000
        })
    });

    await request("/accounts/ticker-seller/deposit", {
        method: "POST",
        body: JSON.stringify({
            asset: "BTC",
            amount: 1
        })
    });

    // Create resting SELL order

    await request("/orders", {
        method: "POST",
        body: JSON.stringify({
            id: "ticker-sell",
            accountId: "ticker-seller",
            symbol: "BTCUSDT",
            side: "SELL",
            type: "LIMIT",
            price: 85000,
            quantity: 0.1
        })
    });

    // Create BUY order -> should match SELL

    await request("/orders", {
        method: "POST",
        body: JSON.stringify({
            id: "ticker-buy",
            accountId: "ticker-buyer",
            symbol: "BTCUSDT",
            side: "BUY",
            type: "LIMIT",
            price: 85000,
            quantity: 0.1
        })
    });
}

main();