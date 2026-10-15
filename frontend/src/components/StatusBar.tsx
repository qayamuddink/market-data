import React from 'react';

interface StatusBarProps {
  wsConnected: boolean;
  orderCount?: number;
  tradeCount?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  wsConnected,
  orderCount = 0,
  tradeCount = 0,
}) => {
  return (
    <footer className="h-7 bg-[#0b0e14] border-t border-[#1a1f2b] px-4 flex items-center justify-between text-[11px] font-mono text-zinc-500 select-none">
      <div className="flex items-center gap-4">
        {/* System state */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wsConnected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className={wsConnected ? 'text-emerald-400' : 'text-amber-400'}>
            {wsConnected ? 'Engine Online' : 'Engine Disconnected'}
          </span>
        </div>

        <span className="text-zinc-700">|</span>
        <span className="hidden sm:inline">Engine: In-Memory Order Book (FIFO Matching)</span>
        <span className="text-zinc-700 hidden sm:inline">|</span>
        <span className="hidden md:inline">Storage: PostgreSQL Accounts Layer</span>
        <span className="text-zinc-700 hidden md:inline">|</span>
        <span className="hidden lg:inline text-zinc-400">
          Orders: <span className="text-zinc-200">{orderCount}</span> | Trades:{' '}
          <span className="text-zinc-200">{tradeCount}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-zinc-600">BTC (8 dec) · USDT (2 dec)</span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400 font-semibold">v1.0.0</span>
      </div>
    </footer>
  );
};
