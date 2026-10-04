import { AccountManager } from "./account";
import { unitsToAmount } from "./asset";

const accountManager = new AccountManager();

const account = accountManager.createAccount("user-1");

console.log("Created Account:");
console.dir(account, { depth: null });

accountManager.addBalance(
    "user-1",
    "USDT",
    10000
);

accountManager.addBalance(
    "user-1",
    "BTC",
    0.5
);

console.log("Account After Deposits:");
console.dir(
    accountManager.getAccount("user-1"),
    { depth: null }
);

console.log(
    "BTC Human Value:",
    unitsToAmount("BTC", 50000000)
);

console.log(
    "USDT Human Value:",
    unitsToAmount("USDT", 1000000)
);