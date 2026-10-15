import React, { useState } from 'react';
import type { Asset } from '../types/account';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onDeposit: (accountId: string, asset: Asset, amount: number) => Promise<{ success: boolean; error?: string }>;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  accountId,
  onDeposit,
}) => {
  const [asset, setAsset] = useState<Asset>('USDT');
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const presets = asset === 'USDT' ? [500, 1000, 5000, 10000] : [0.01, 0.05, 0.1, 1.0];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid deposit amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onDeposit(accountId, asset, amount);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError(result.error || 'Failed to deposit funds.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error depositing funds';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#121622] border border-[#23293a] rounded-lg w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#202534] mb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              +
            </span>
            <h3 className="font-bold text-sm text-white">Deposit Test Funds</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Target Account</label>
            <div className="px-3 py-2 rounded bg-[#171b28] border border-[#23293a] text-xs font-mono text-zinc-200">
              {accountId}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Asset to Deposit</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAsset('USDT');
                  setAmountInput('1000');
                }}
                className={`py-2 rounded text-xs font-bold border transition-colors ${
                  asset === 'USDT'
                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-[#171b28] border-[#23293a] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                USDT (Tether)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAsset('BTC');
                  setAmountInput('0.1');
                }}
                className={`py-2 rounded text-xs font-bold border transition-colors ${
                  asset === 'BTC'
                    ? 'bg-amber-600/20 border-amber-500/50 text-amber-400'
                    : 'bg-[#171b28] border-[#23293a] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                BTC (Bitcoin)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Amount</label>
            <div className="relative rounded bg-[#171b28] border border-[#23293a] focus-within:border-zinc-400">
              <input
                type="number"
                step={asset === 'BTC' ? '0.0001' : '1'}
                min="0.0001"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                {asset}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5 mt-2 font-mono text-[10px]">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(String(val))}
                  className="py-1 rounded bg-[#171b28] border border-[#23293a] text-zinc-400 hover:text-zinc-100 hover:bg-[#202636] transition-colors"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-medium">
              ✓ Successfully deposited {amountInput} {asset}!
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded bg-[#171b28] hover:bg-[#202534] text-xs text-zinc-400 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : `Deposit ${asset}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
