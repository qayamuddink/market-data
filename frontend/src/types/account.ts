export type Asset = 'BTC' | 'USDT';

export interface Balance {
  available: number;
  locked: number;
}

export interface AccountData {
  id: string;
  balances: {
    BTC?: Balance;
    USDT?: Balance;
    [asset: string]: Balance | undefined;
  };
}

export interface DepositPayload {
  asset: Asset;
  amount: number;
}
