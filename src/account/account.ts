import type { Account, Balance } from "../types/account";
import type { Asset } from "./asset";
import { amountToUnits } from "./asset";

export class AccountManager {

    private accounts: Map<string, Account> = new Map();

    createAccount(id: string): Account {

        if(this.accounts.has(id)){
            throw new Error("Account already exists");
        }

        const account: Account = {
            id,
            balances: new Map()
        };

        this.accounts.set(id,account);

        return account;
    }

    getAccount(id: string): Account | undefined {
        return this.accounts.get(id);
    }

    addBalance(
        accountId: string,
        asset: Asset,
        amount: number
    ): void {

        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error("Account not found");
        }

        const balance: Balance = account.balances.get(asset) ?? {
            available: 0,
            locked: 0
        };

        balance.available += amountToUnits(asset, amount);

        account.balances.set(asset, balance);
    }

    lockBalance(
        accountId: string,
        asset: Asset,
        amount: number
    ): void {

        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error("Account not found");
        }

        const balance: Balance = account.balances.get(asset) ?? {
            available: 0,
            locked: 0
        };

        const amountUnits = amountToUnits(asset, amount);

        if (balance.available < amountUnits) {
            throw new Error("Insufficient balance");
        }

        balance.available -= amountUnits;
        balance.locked += amountUnits;

        account.balances.set(asset, balance);
    }

    unlockBalance(
        accountId: string,
        asset: Asset,
        amount: number
    ): void {

        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error("Account not found");
        }

        const balance: Balance = account.balances.get(asset) ?? {
            available: 0,
            locked: 0
        };

        const amountUnits = amountToUnits(asset, amount);

        if (balance.locked < amountUnits) {
            throw new Error("Insufficient locked balance");
        }

        balance.locked -= amountUnits;
        balance.available += amountUnits;

        account.balances.set(asset, balance);
    }

    deductBalance(accountId: string , asset:Asset, amount: number) : void {
        const account = this.accounts.get(accountId);
        if(!account){
            throw new Error("Account not found");
        }

        const balance: Balance = account.balances.get(asset)?? {
            available: 0,
            locked: 0
        }

        const amountUnits = amountToUnits(asset, amount);
        if(balance.locked < amountUnits){
            throw new Error("Insufficient locked balance");
        }

        balance.locked -= amountUnits;

        account.balances.set(asset, balance);
    }

    creditBalance(accountId: string , asset: Asset, amount: number) : void {
        const account = this.accounts.get(accountId);
        if(!account){
            throw new Error("Account not found");
        }

        const balance: Balance = account.balances.get(asset) ?? {
            available:0 ,
            locked: 0
        }

        balance.available += amountToUnits(asset, amount);
        account.balances.set(asset, balance);
    }

    
    getBalanceSnapshots(accountIds: string[]): {
        accountId: string;
        asset: string;
        available: number;
        locked: number;
    }[] {
        const snapshots: {
            accountId: string;
            asset: string;
            available: number;
            locked: number;
        }[] = [];

        for (const accountId of accountIds) {
            const account = this.accounts.get(accountId);

            if (!account) {
                throw new Error("Account not found");
            }

            for (const [asset, balance] of account.balances) {
                snapshots.push({
                    accountId,
                    asset,
                    available: balance.available,
                    locked: balance.locked
                });
            }
        }

        return snapshots;
        
    }   


}