import React, { useState } from 'react';
import type { ManagedOrder } from '../types/order';
import type { AccountData } from '../types/account';
import { formatPrice, formatQuantity } from '../utils/formatters';

interface OpenOrdersProps {
  orders: ManagedOrder[];
  accountId: string;
  accountData?: AccountData | null;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  onOpenDepositModal: () => void;
  isLoading?: boolean;
}

export const OpenOrders: React.FC<OpenOrdersProps> = ({
  orders,
  accountId,
  accountData,
  onCancelOrder,
  onOpenDepositModal,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'open' | 'balances' | 'history'>('open');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filterCurrentAccountOnly, setFilterCurrentAccountOnly] = useState<boolean>(true);

  // Filter orders
  const relevantOrders = filterCurrentAccountOnly
    ? orders.filter((o) => o.accountId === accountId)
    : orders;

  const openOrders = relevantOrders.filter(
    (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
  );

  const historyOrders = relevantOrders.filter(
    (o) => o.status !== 'OPEN' && o.status !== 'PARTIALLY_FILLED'
  );

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId);
    } finally {
      setCancellingId(null);
    }
  };

  const btcBalance = accountData?.balances?.BTC || { available: 0, locked: 0 };
  const usdtBalance = accountData?.balances?.USDT || { available: 0, locked: 0 };

  return (
    <section className="h-64 bg-[#10131c] border border-[#1e2330] rounded flex flex-col overflow-hidden select-none">
      {/* Tab Navigation */}
      <div className="h-9 px-3 border-b border-[#1c212e] flex items-center justify-between text-xs bg-[#0e1119]">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`font-semibold flex items-center gap-1.5 transition-colors pb-2.5 pt-2 border-b-2 -mb-px ${
              activeTab === 'open'
                ? 'text-zinc-100 border-emerald-500 font-bold'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <span>Open Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#181d2a] text-[10px] font-mono text-zinc-400">
              {openOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('balances')}
            className={`font-semibold flex items-center gap-1.5 transition-colors pb-2.5 pt-2 border-b-2 -mb-px ${
              activeTab === 'balances'
                ? 'text-zinc-100 border-emerald-500 font-bold'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <span>Balances</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`font-semibold flex items-center gap-1.5 transition-colors pb-2.5 pt-2 border-b-2 -mb-px ${
              activeTab === 'history'
                ? 'text-zinc-100 border-emerald-500 font-bold'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <span>Order History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#181d2a] text-[10px] font-mono text-zinc-400">
              {historyOrders.length}
            </span>
          </button>
        </div>

        {/* Account Filter Checkbox */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filterCurrentAccountOnly}
              onChange={(e) => setFilterCurrentAccountOnly(e.target.checked)}
              className="rounded bg-[#181d2a] border-[#222838] text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <span>Filter for {accountId}</span>
          </label>
        </div>
      </div>

      {/* Tab 1: Open Orders */}
      {activeTab === 'open' && (
        <div className="flex-1 flex flex-col overflow-x-auto bg-[#0c0f16]">
          <div className="min-w-[650px] flex-1 flex flex-col">
            <div className="grid grid-cols-8 px-3 py-1.5 text-[10px] font-mono text-zinc-500 border-b border-[#181c28] bg-[#0d1017]">
              <div>Order ID</div>
              <div>Account</div>
              <div>Side</div>
              <div>Type</div>
              <div className="text-right">Price (USDT)</div>
              <div className="text-right">Remaining</div>
              <div className="text-center">Status</div>
              <div className="text-right">Action</div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#151924] font-mono text-xs text-[11px]">
              {isLoading && (
                <div className="py-10 text-center text-zinc-500">Loading open orders...</div>
              )}

              {!isLoading && openOrders.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <span className="text-zinc-600 text-base mb-1">📋</span>
                  <span className="text-xs text-zinc-400 font-semibold">No Open Orders</span>
                  <span className="text-[11px] text-zinc-600 mt-0.5">
                    Resting limit orders waiting for matching will appear here.
                  </span>
                </div>
              )}

              {!isLoading &&
                openOrders.map((ord) => {
                  const remaining = ord.originalQuantity - ord.filledQuantity;
                  return (
                    <div
                      key={ord.id}
                      className="grid grid-cols-8 px-3 py-2 items-center hover:bg-[#131722] transition-colors"
                    >
                      <div className="text-zinc-400 truncate" title={ord.id}>
                        {ord.id}
                      </div>
                      <div className="text-zinc-500 truncate">{ord.accountId}</div>
                      <div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.side === 'BUY'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </div>
                      <div className="text-zinc-400">{ord.type}</div>
                      <div className="text-right text-zinc-200 tabular-nums">
                        {formatPrice(ord.price)}
                      </div>
                      <div className="text-right text-zinc-300 tabular-nums">
                        {formatQuantity(remaining, 4)} / {formatQuantity(ord.originalQuantity, 4)}
                      </div>
                      <div className="text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/50 text-blue-400 border border-blue-800/30">
                          {ord.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => handleCancel(ord.id)}
                          disabled={cancellingId === ord.id}
                          className="px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 hover:text-rose-300 border border-rose-600/30 text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {cancellingId === ord.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Balances */}
      {activeTab === 'balances' && (
        <div className="flex-1 p-3 bg-[#0c0f16] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">
              Balances for <span className="text-white font-mono font-bold">{accountId}</span>
            </span>
            <button
              type="button"
              onClick={onOpenDepositModal}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
            >
              + Deposit Funds
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {/* BTC Card */}
            <div className="p-3 rounded bg-[#131722] border border-[#202636] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                    ₿
                  </span>
                  <span className="text-xs font-bold text-zinc-100">Bitcoin (BTC)</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Base Asset</span>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1 border-t border-[#1a1f2c]">
                <div>
                  <div className="text-[10px] text-zinc-500">Available</div>
                  <div className="text-emerald-400 font-bold tabular-nums">
                    {formatQuantity(btcBalance.available, 6)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Locked (Orders)</div>
                  <div className="text-zinc-400 tabular-nums">{formatQuantity(btcBalance.locked, 6)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Total</div>
                  <div className="text-zinc-200 font-semibold tabular-nums">
                    {formatQuantity(btcBalance.available + btcBalance.locked, 6)}
                  </div>
                </div>
              </div>
            </div>

            {/* USDT Card */}
            <div className="p-3 rounded bg-[#131722] border border-[#202636] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    $
                  </span>
                  <span className="text-xs font-bold text-zinc-100">Tether (USDT)</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Quote Asset</span>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1 border-t border-[#1a1f2c]">
                <div>
                  <div className="text-[10px] text-zinc-500">Available</div>
                  <div className="text-emerald-400 font-bold tabular-nums">
                    {formatPrice(usdtBalance.available)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Locked (Orders)</div>
                  <div className="text-zinc-400 tabular-nums">{formatPrice(usdtBalance.locked)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Total</div>
                  <div className="text-zinc-200 font-semibold tabular-nums">
                    {formatPrice(usdtBalance.available + usdtBalance.locked)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Order History */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col overflow-x-auto bg-[#0c0f16]">
          <div className="min-w-[650px] flex-1 flex flex-col">
            <div className="grid grid-cols-7 px-3 py-1.5 text-[10px] font-mono text-zinc-500 border-b border-[#181c28] bg-[#0d1017]">
              <div>Order ID</div>
              <div>Account</div>
              <div>Side</div>
              <div>Type</div>
              <div className="text-right">Price (USDT)</div>
              <div className="text-right">Filled / Total</div>
              <div className="text-center">Status</div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#151924] font-mono text-xs text-[11px]">
              {historyOrders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-zinc-500">No completed or cancelled orders yet.</span>
                </div>
              ) : (
                historyOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="grid grid-cols-7 px-3 py-2 items-center hover:bg-[#131722] transition-colors"
                  >
                    <div className="text-zinc-400 truncate">{ord.id}</div>
                    <div className="text-zinc-500 truncate">{ord.accountId}</div>
                    <div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ord.side === 'BUY'
                            ? 'text-emerald-400 bg-emerald-950/40'
                            : 'text-rose-400 bg-rose-950/40'
                        }`}
                      >
                        {ord.side}
                      </span>
                    </div>
                    <div className="text-zinc-400">{ord.type}</div>
                    <div className="text-right text-zinc-300 tabular-nums">{formatPrice(ord.price)}</div>
                    <div className="text-right text-zinc-300 tabular-nums">
                      {formatQuantity(ord.filledQuantity, 4)} / {formatQuantity(ord.originalQuantity, 4)}
                    </div>
                    <div className="text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          ord.status === 'FILLED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
