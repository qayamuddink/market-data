import type { Account, Balance } from "../types/account";
import { amountToUnits, type Asset } from "./asset";


export class AccountManager {
    private accounts: Map<string,Account> = new Map();
    
    createAccount(id: string): Account {
        const account: Account = {
            id,
            balances: new Map()
        };
        this.accounts.set(id, account);
        return account;
    }

    getAccount(id: string): Account | undefined {
        return this.accounts.get(id);
    }

    addBalance(accountId: string, asset: Asset, amount: number): void {
        const account = this.accounts.get(accountId);
        if(!account){
            throw new Error("account not found");
        }

        const balance: Balance = account.balances.get(asset) ?? {
            available: 0 ,
            locked: 0 
        }
        balance.available += amountToUnits(asset, amount);
        account.balances.set(asset, balance);
    }


    lockBalance(accountId: string , asset: Asset, amount: number) : void {
        const account = this.accounts.get(accountId);
        if(!account){
            throw new Error("Account not found");
        }

        const balance: Balance = account.balances.get(asset) ?? {
            available: 0,
            locked: 0
        }

        const amountUnits = amountToUnits(asset, amount);
        if(balance.available < amountUnits){
            throw new Error("Insufficient Balance");
        }

    }

    unlockBalance(accountId: string, asset: Asset, amount: number){
        const account = this.accounts.get(accountId);
        if(!account){
            throw new Error("Account not found");
            
        }
    }
}