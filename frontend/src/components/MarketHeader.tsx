import React from 'react';
import { formatPrice } from '../utils/formatters';

interface MarketHeaderProps {
  symbol: string;
  lastPrice: number;
  prevPrice?: number;
  bestBid?: number;
  bestAsk?: number;
  highPrice?: number;
  lowPrice?: number;
  tradeCount?: number;
}

export const MarketHeader: React.FC<MarketHeaderProps> = ({
  symbol,
  lastPrice,
  prevPrice,
  bestBid,
  bestAsk,
  highPrice,
  lowPrice,
  tradeCount = 0,
}) => {
  const isUp = prevPrice !== undefined && lastPrice > prevPrice;
  const isDown = prevPrice !== undefined && lastPrice < prevPrice;

  const priceColor = isUp
    ? 'text-emerald-400'
    : isDown
    ? 'text-rose-400'
    : 'text-zinc-100';

  const spread =
    bestAsk !== undefined && bestBid !== undefined && bestAsk > bestBid
      ? bestAsk - bestBid
      : undefined;

  const spreadPct =
    spread !== undefined && bestAsk ? ((spread / bestAsk) * 100).toFixed(2) : undefined;

  return (
    <div className="h-13 bg-[#0d1017] border-b border-[#1c212e] px-4 flex items-center justify-between text-xs overflow-x-auto select-none">
      <div className="flex items-center gap-7 min-w-max py-1">
        {/* Pair Name */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-white tracking-wide">{symbol}</span>
          <span className="text-[10px] text-zinc-500 font-mono">Bitcoin / Tether</span>
        </div>

        <div className="h-4 w-px bg-[#1f2433]" />

        {/* Last Price */}
        <div>
          <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Last Price</div>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className={`text-sm font-bold tabular-nums transition-colors duration-200 ${priceColor}`}>
              {lastPrice > 0 ? formatPrice(lastPrice) : '--.--'}
            </span>
            <span className="text-[10px] text-zinc-400 font-normal">USDT</span>
          </div>
        </div>

        {/* 24h Change / Session indicator */}
        <div>
          <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">24h Change</div>
          <div className="font-mono text-xs text-zinc-500 flex items-center gap-1">
            <span className="tabular-nums">N/A</span>
            <span
              className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 cursor-help"
              title="Backend does not compute 24h stats; data is not fabricated."
            >
              Backend Limit
            </span>
          </div>
        </div>

        {/* Best Bid */}
        <div>
          <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Best Bid</div>
          <div className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
            {bestBid !== undefined ? formatPrice(bestBid) : '--.--'}
          </div>
        </div>

        {/* Best Ask */}
        <div>
          <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Best Ask</div>
          <div className="font-mono text-xs font-semibold text-rose-400 tabular-nums">
            {bestAsk !== undefined ? formatPrice(bestAsk) : '--.--'}
          </div>
        </div>

        {/* Spread */}
        {spread !== undefined && (
          <div>
            <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Spread</div>
            <div className="font-mono text-xs text-zinc-300 tabular-nums">
              {formatPrice(spread)} <span className="text-[10px] text-zinc-500">({spreadPct}%)</span>
            </div>
          </div>
        )}

        {/* Session Range */}
        {highPrice !== undefined && lowPrice !== undefined && highPrice > 0 && (
          <div className="hidden xl:block">
            <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Session Range</div>
            <div className="font-mono text-[11px] text-zinc-400 tabular-nums">
              L: <span className="text-zinc-300">{formatPrice(lowPrice)}</span> — H:{' '}
              <span className="text-zinc-300">{formatPrice(highPrice)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right side live status indicator */}
      <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500 min-w-max ml-4">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">Trades:</span>
          <span className="text-zinc-200 font-bold tabular-nums">{tradeCount}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#141824] px-2 py-0.5 rounded border border-[#202636]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-zinc-400 uppercase">Live Stream</span>
        </div>
      </div>
    </div>
  );
};
