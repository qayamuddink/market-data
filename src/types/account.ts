import type { Asset } from "../account/asset";


export type Balance = {
    available: number;
    locked: number;
}

export type Account = {
    id: string;
    balances: Map<Asset, Balance>;
}

