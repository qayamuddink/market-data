import { AccountManager } from "./account";
import { amountToUnits, calculateQuoteAmount, unitsToAmount } from "./asset";

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


console.log("\n===== TEST: LOCK BALANCE =====");

accountManager.lockBalance(
    "user-1",
    "USDT",
    4250
);

console.log("After Locking 4250 USDT:");
console.dir(
    accountManager.getAccount("user-1"),
    { depth: null }
);


console.log("\n===== TEST: UNLOCK BALANCE =====");

accountManager.unlockBalance(
    "user-1",
    "USDT",
    4250
);

console.log("After Unlocking 4250 USDT:");
console.dir(
    accountManager.getAccount("user-1"),
    { depth: null }
);


console.log("\n===== TEST: DEDUCT BALANCE =====");

accountManager.lockBalance(
    "user-1",
    "USDT",
    4250
);

accountManager.deductBalance(
    "user-1",
    "USDT",
    4250
);

console.log("After Deducting 4250 USDT:");
console.dir(
    accountManager.getAccount("user-1"),
    { depth: null }
);


console.log("\n===== TEST: CREDIT BALANCE =====");

accountManager.creditBalance(
    "user-1",
    "BTC",
    0.05
);

console.log("After Crediting 0.05 BTC:");
console.dir(
    accountManager.getAccount("user-1"),
    { depth: null }
);


console.log("\n===== TEST: QUOTE AMOUNT =====");

const price = amountToUnits("USDT", 85000);
const quantity = amountToUnits("BTC", 0.03);

const quoteUnits = calculateQuoteAmount(
    price,
    quantity
);

const quoteAmount = unitsToAmount(
    "USDT",
    quoteUnits
);

console.log("Price:", price);
console.log("Quantity:", quantity);
console.log("Quote Units:", quoteUnits);
console.log("Quote Amount:", quoteAmount);