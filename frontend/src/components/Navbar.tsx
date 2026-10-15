import React from 'react';

interface NavbarProps {
  symbol: string;
  wsConnected: boolean;
  wsStatusText?: string;
  accountId: string;
  onOpenAccountModal: () => void;
  onOpenDepositModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  symbol,
  wsConnected,
  wsStatusText = 'Disconnected',
  accountId,
  onOpenAccountModal,
  onOpenDepositModal,
}) => {
  return (
    <header className="h-13 bg-[#11141d] border-b border-[#1e2330] px-4 flex items-center justify-between select-none">
      {/* Brand & Market Switcher */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs tracking-wider text-white">CRYPTO EXCHANGE</span>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Trading Terminal</span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#202534]" />

        {/* Active Market Selector */}
        <div className="flex items-center gap-2 bg-[#161a25] border border-[#23293a] px-2.5 py-1 rounded">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-100">{symbol}</span>
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SPOT
            </span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 text-xs">
          <button
            type="button"
            className="px-2.5 py-1 rounded bg-[#1c2232] text-zinc-100 font-medium border border-[#272e42]"
          >
            Spot
          </button>
          <span className="px-2.5 py-1 text-zinc-500 cursor-not-allowed">Perpetual (N/A)</span>
        </nav>
      </div>

      {/* Right Controls: Connectivity & Account Info */}
      <div className="flex items-center gap-3">
        {/* WebSocket Connection Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
            wsConnected
              ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400'
              : 'bg-amber-950/30 border-amber-800/40 text-amber-400'
          }`}
          title={`WebSocket Status: ${wsStatusText}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="hidden sm:inline font-medium">WS:</span>
          <span>{wsConnected ? 'Connected' : wsStatusText}</span>
        </div>

        {/* Account Selector Pill */}
        <div className="flex items-center bg-[#161a25] border border-[#23293a] rounded divide-x divide-[#202534] text-xs">
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#1e2332] text-zinc-300 font-mono transition-colors"
            title="Switch Account"
          >
            <span className="text-zinc-500 text-[10px]">ACC:</span>
            <span className="font-semibold text-zinc-200">{accountId}</span>
            <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenDepositModal}
            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-medium text-[11px] transition-colors"
            title="Deposit funds"
          >
            + Deposit
          </button>
        </div>
      </div>
    </header>
  );
};
