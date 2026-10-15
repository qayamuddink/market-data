export interface RawOrderBookPriceLevel {
  price: number;
  orders: {
    id: string;
    accountId: string;
    quantity: number;
  }[];
}

export interface RawOrderBook {
  bids: RawOrderBookPriceLevel[];
  asks: RawOrderBookPriceLevel[];
}

export interface FormattedBookLevel {
  price: number;
  quantity: number;
  total: number; // cumulative size
  orderCount: number;
  depthPercent: number; // 0 to 100 for visual depth bar
}

export interface TickerData {
  symbol: string;
  lastPrice: number;
  bestBid?: number;
  bestAsk?: number;
}
