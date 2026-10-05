import { AccountManager } from "../account/account";

import type { ExecuteTrade } from "../types/order";
import { Settlement } from "./settlement";

const accountManager = new AccountManager();

const settlement = new  Settlement(
    accountManager
);


// ===============================
// CREATE ACCOUNTS
// ===============================

accountManager.createAccount("user-1");
accountManager.createAccount("user-2");


// ===============================
// INITIAL BALANCES
// ===============================

accountManager.addBalance(
    "user-1",
    "USDT",
    10000
);

accountManager.addBalance(
    "user-2",
    "BTC",
    1
);


// ===============================
// SIMULATE RESERVED FUNDS
// ===============================

accountManager.lockBalance(
    "user-1",
    "USDT",
    2550
);

accountManager.lockBalance(
    "user-2",
    "BTC",
    0.03
);


console.log("===== BEFORE SETTLEMENT =====");

console.log(
    "User 1:",
    accountManager.getAccount("user-1")
);

console.log(
    "User 2:",
    accountManager.getAccount("user-2")
);


// ===============================
// TRADE
// ===============================

const trade: ExecuteTrade = {
    id: "trade-1",
    symbol: "BTCUSDT",
    price: 8500000,
    quantity: 3000000,
    buyOrderId: "order-1",
    sellOrderId: "order-2",
    buyAccountId: "user-1",
    sellAccountId: "user-2",
    timestamp: Date.now()
};


// ===============================
// SETTLE
// ===============================

settlement.settle(trade);


console.log("\n===== AFTER SETTLEMENT =====");

console.log(
    "User 1:",
    accountManager.getAccount("user-1")
);

console.log(
    "User 2:",
    accountManager.getAccount("user-2")
);