import React, { useMemo } from 'react';
import type { Trade } from '../types/order';
import { formatPrice, formatQuantity, formatTimestamp } from '../utils/formatters';

interface RecentTradesProps {
  trades: Trade[];
  isLoading?: boolean;
}

export const RecentTrades: React.FC<RecentTradesProps> = ({
  trades,
  isLoading = false,
}) => {
  // Sort trades newest first for recent stream
  const sortedTrades = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    return [...trades].sort((a, b) => b.timestamp - a.timestamp);
  }, [trades]);

  return (
    <section className="h-56 bg-[#10131c] border border-[#1e2330] rounded flex flex-col overflow-hidden select-none">
      {/* Header Bar */}
      <div className="h-9 px-3 border-b border-[#1c212e] flex items-center justify-between text-xs bg-[#0e1119]">
        <span className="font-bold text-zinc-100 flex items-center gap-1.5">
          <span>Recent Trades</span>
          <span className="text-[10px] text-zinc-500 font-normal">Market Stream</span>
        </span>
        <span className="text-[10px] font-mono text-zinc-500">
          {sortedTrades.length} trades
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] font-mono text-zinc-500 border-b border-[#181c28] bg-[#0c0f16]">
        <div className="text-left">Price (USDT)</div>
        <div className="text-right">Size (BTC)</div>
        <div className="text-right">Time</div>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto font-mono text-xs text-[11px] bg-[#0c0f16] divide-y divide-transparent">
        {isLoading && (
          <div className="py-8 text-center text-zinc-500 text-xs">
            Loading recent trades...
          </div>
        )}

        {!isLoading && sortedTrades.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <span className="text-zinc-600 text-sm mb-1">⏳</span>
            <span className="text-xs text-zinc-400 font-semibold">No Trades Executed</span>
            <span className="text-[11px] text-zinc-600 mt-0.5 max-w-[200px]">
              Executed market trades will stream here automatically.
            </span>
          </div>
        )}

        {!isLoading &&
          sortedTrades.map((trade, idx) => {
            // Compare price to older trade (at idx + 1) to determine tick direction
            const olderTrade = sortedTrades[idx + 1];
            const isUp = olderTrade ? trade.price > olderTrade.price : true;
            const isDown = olderTrade ? trade.price < olderTrade.price : false;

            const colorClass = isUp
              ? 'text-emerald-400'
              : isDown
              ? 'text-rose-400'
              : 'text-zinc-300';

            return (
              <div
                key={trade.id || `${trade.timestamp}-${idx}`}
                className="grid grid-cols-3 px-3 py-1 hover:bg-[#161a25] transition-colors"
              >
                <div className={`text-left font-semibold tabular-nums ${colorClass}`}>
                  {formatPrice(trade.price)}
                </div>
                <div className="text-right text-zinc-300 tabular-nums">
                  {formatQuantity(trade.quantity, 4)}
                </div>
                <div className="text-right text-zinc-500 tabular-nums text-[10px]">
                  {formatTimestamp(trade.timestamp)}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
};
