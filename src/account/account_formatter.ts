import type { Account } from "../types/account";
import { unitsToAmount } from "./asset";

export function formatAccount(account: Account) {
    const balances = Object.fromEntries(
        Array.from(account.balances.entries()).map(
            ([asset, balance]) => [
                asset,
                {
                    available: unitsToAmount(
                        asset,
                        balance.available
                    ),
                    locked: unitsToAmount(
                        asset,
                        balance.locked
                    )
                }
            ]
        )
    );

    return {
        id: account.id,
        balances
    };
}