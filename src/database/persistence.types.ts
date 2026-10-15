
import type { Order, ExecuteTrade, OrderStatus } from "../types/order";

export type BalanceSnapshot = {
    accountId: string;
    asset: string;
    available: number;
    locked: number;
};

export type NewOrderRecord = {
    order: Order;
    status: OrderStatus;
    remainingQuantity: number;
};

export type UpdatedOrderRecord = {
    orderId: string;
    status: OrderStatus;
    remainingQuantity: number;
};

export type OrderExecutionCommit = {
    newOrder: NewOrderRecord;
    updatedOrders: UpdatedOrderRecord[];
    trades: ExecuteTrade[];
    balances: BalanceSnapshot[];
};

export interface ExchangePersistence {
    commitOrderExecution(
        execution: OrderExecutionCommit
    ): Promise<void>;
}



export interface AccountPersistence {
    createAccount(accountId: string): Promise<void>;
    getAccountIds(): Promise<string[]>;
    getBalances(): Promise<BalanceSnapshot[]>;
}
