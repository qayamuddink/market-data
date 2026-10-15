import React, { useMemo, useState } from 'react';
import type { RawOrderBook, FormattedBookLevel } from '../types/market';
import { formatPrice, formatQuantity, formatTotal } from '../utils/formatters';

interface OrderBookProps {
  orderBook: RawOrderBook;
  lastPrice?: number;
  onSelectPrice?: (price: number) => void;
  isLoading?: boolean;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  orderBook,
  lastPrice,
  onSelectPrice,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'bids' | 'asks'>('both');

  // Process Asks: sort ascending by price (lowest ask = best ask)
  const asksData = useMemo(() => {
    if (!orderBook?.asks || orderBook.asks.length === 0) return [];

    const sorted = [...orderBook.asks].sort((a, b) => a.price - b.price);
    let runningTotal = 0;

    const levels: FormattedBookLevel[] = sorted.map((level) => {
      const qty = level.orders.reduce((sum, o) => sum + o.quantity, 0);
      runningTotal += qty;
      return {
        price: level.price,
        quantity: qty,
        total: runningTotal,
        orderCount: level.orders.length,
        depthPercent: 0,
      };
    });

    const maxTotal = runningTotal || 1;
    return levels.map((l) => ({
      ...l,
      depthPercent: Math.min(100, Math.round((l.total / maxTotal) * 100)),
    }));
  }, [orderBook?.asks]);

  // Process Bids: sort descending by price (highest bid = best bid)
  const bidsData = useMemo(() => {
    if (!orderBook?.bids || orderBook.bids.length === 0) return [];

    const sorted = [...orderBook.bids].sort((a, b) => b.price - a.price);
    let runningTotal = 0;

    const levels: FormattedBookLevel[] = sorted.map((level) => {
      const qty = level.orders.reduce((sum, o) => sum + o.quantity, 0);
      runningTotal += qty;
      return {
        price: level.price,
        quantity: qty,
        total: runningTotal,
        orderCount: level.orders.length,
        depthPercent: 0,
      };
    });

    const maxTotal = runningTotal || 1;
    return levels.map((l) => ({
      ...l,
      depthPercent: Math.min(100, Math.round((l.total / maxTotal) * 100)),
    }));
  }, [orderBook?.bids]);

  const bestAsk = asksData[0]?.price;
  const bestBid = bidsData[0]?.price;
  const spread =
    bestAsk !== undefined && bestBid !== undefined && bestAsk >= bestBid
      ? bestAsk - bestBid
      : undefined;

  // For the "both" view, limit to top 8 asks (reversed for standard book: highest at top, best ask at bottom)
  const displayedAsks = useMemo(() => {
    if (viewMode === 'bids') return [];
    const slice = viewMode === 'both' ? asksData.slice(0, 9) : asksData;
    // Standard terminal display: reverse so lowest (best) ask is adjacent to the spread
    return [...slice].reverse();
  }, [asksData, viewMode]);

  const displayedBids = useMemo(() => {
    if (viewMode === 'asks') return [];
    return viewMode === 'both' ? bidsData.slice(0, 9) : bidsData;
  }, [bidsData, viewMode]);

  return (
    <section className="flex-1 min-h-[360px] bg-[#10131c] border border-[#1e2330] rounded flex flex-col overflow-hidden select-none">
      {/* Header Bar */}
      <div className="h-9 px-3 border-b border-[#1c212e] flex items-center justify-between text-xs bg-[#0e1119]">
        <span className="font-bold text-zinc-100 flex items-center gap-1.5">
          <span>Order Book</span>
          <span className="text-[10px] text-zinc-500 font-normal">Depth</span>
        </span>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#151924] border border-[#202534] rounded p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            title="Both sides"
            className={`px-1.5 py-0.5 rounded transition-colors ${
              viewMode === 'both' ? 'bg-[#222838] text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bids')}
            title="Bids only"
            className={`px-1.5 py-0.5 rounded transition-colors ${
              viewMode === 'bids' ? 'bg-emerald-950 text-emerald-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Bids
          </button>
          <button
            type="button"
            onClick={() => setViewMode('asks')}
            title="Asks only"
            className={`px-1.5 py-0.5 rounded transition-colors ${
              viewMode === 'asks' ? 'bg-rose-950 text-rose-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Asks
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] font-mono text-zinc-500 border-b border-[#181c28] bg-[#0c0f16]">
        <div className="text-left">Price (USDT)</div>
        <div className="text-right">Size (BTC)</div>
        <div className="text-right">Total (USDT)</div>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto font-mono text-xs text-[11px] bg-[#0c0f16]">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-mono">
            Loading order book...
          </div>
        )}

        {/* Asks (Sell Orders) */}
        {viewMode !== 'bids' && (
          <div className="flex-1 flex flex-col justify-end divide-y divide-transparent">
            {displayedAsks.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-zinc-600">No resting asks</div>
            ) : (
              displayedAsks.map((level) => (
                <div
                  key={`ask-${level.price}`}
                  onClick={() => onSelectPrice?.(level.price)}
                  className="relative grid grid-cols-3 px-3 py-0.5 hover:bg-rose-500/10 cursor-pointer transition-colors group"
                >
                  {/* Depth Background Bar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none transition-all duration-150"
                    style={{ width: `${level.depthPercent}%` }}
                  />
                  <div className="text-rose-400 font-semibold tabular-nums text-left z-10">
                    {formatPrice(level.price)}
                  </div>
                  <div className="text-zinc-300 tabular-nums text-right z-10">
                    {formatQuantity(level.quantity, 4)}
                  </div>
                  <div className="text-zinc-500 tabular-nums text-right z-10">
                    {formatTotal(level.price, level.total)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Spread / Mid-Market Price Indicator Bar */}
        {viewMode === 'both' && (
          <div className="my-1 px-3 py-1 bg-[#121622] border-y border-[#1c212e] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-100 tabular-nums">
                {lastPrice ? formatPrice(lastPrice) : '--.--'}
              </span>
              <span className="text-[10px] text-zinc-500">USDT</span>
            </div>
            {spread !== undefined && (
              <div className="text-[10px] text-zinc-500">
                Spread: <span className="text-zinc-400 font-mono">{formatPrice(spread)}</span>
              </div>
            )}
          </div>
        )}

        {/* Bids (Buy Orders) */}
        {viewMode !== 'asks' && (
          <div className="flex-1 flex flex-col justify-start divide-y divide-transparent">
            {displayedBids.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-zinc-600">No resting bids</div>
            ) : (
              displayedBids.map((level) => (
                <div
                  key={`bid-${level.price}`}
                  onClick={() => onSelectPrice?.(level.price)}
                  className="relative grid grid-cols-3 px-3 py-0.5 hover:bg-emerald-500/10 cursor-pointer transition-colors group"
                >
                  {/* Depth Background Bar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none transition-all duration-150"
                    style={{ width: `${level.depthPercent}%` }}
                  />
                  <div className="text-emerald-400 font-semibold tabular-nums text-left z-10">
                    {formatPrice(level.price)}
                  </div>
                  <div className="text-zinc-300 tabular-nums text-right z-10">
                    {formatQuantity(level.quantity, 4)}
                  </div>
                  <div className="text-zinc-500 tabular-nums text-right z-10">
                    {formatTotal(level.price, level.total)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="h-6 px-3 bg-[#0d1017] border-t border-[#1c212e] flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <span>Click row to fill price</span>
        <span>Precision: 0.01 USDT</span>
      </div>
    </section>
  );
};
