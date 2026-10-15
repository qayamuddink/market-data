import React, { useState } from 'react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onCreateAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  currentAccountId,
  onSelectAccount,
  onCreateAccount,
}) => {
  const [newAccountId, setNewAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultAccounts = ['api-account-1', 'api-account-2', 'trader-alice', 'trader-bob'];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = newAccountId.trim();
    if (!trimmed) {
      setError('Please enter a valid account ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onCreateAccount(trimmed);
      if (res.success) {
        onSelectAccount(trimmed);
        onClose();
      } else {
        setError(res.error || 'Failed to create account.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating account';
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
            <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs">
              👤
            </span>
            <h3 className="font-bold text-sm text-white">Account Management</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Current Account */}
        <div className="mb-4 p-3 rounded bg-[#171b28] border border-[#23293a]">
          <div className="text-[10px] text-zinc-500 font-mono uppercase">Active Session Account</div>
          <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">{currentAccountId}</div>
        </div>

        {/* Quick Select Preset Dev Accounts */}
        <div className="mb-5">
          <label className="block text-[11px] font-mono text-zinc-400 mb-2">Switch to Known Account</label>
          <div className="grid grid-cols-2 gap-2">
            {defaultAccounts.map((acc) => (
              <button
                key={acc}
                type="button"
                onClick={() => {
                  onSelectAccount(acc);
                  onClose();
                }}
                className={`py-2 px-3 rounded text-xs font-mono text-left border transition-colors flex items-center justify-between cursor-pointer ${
                  acc === currentAccountId
                    ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-400'
                    : 'bg-[#171b28] border-[#23293a] text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <span className="truncate">{acc}</span>
                {acc === currentAccountId && <span className="text-[10px] text-emerald-400">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Create New Account Form */}
        <form onSubmit={handleCreate} className="pt-3 border-t border-[#202534] space-y-3">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">
              Create New Development Account
            </label>
            <div className="relative rounded bg-[#171b28] border border-[#23293a] focus-within:border-zinc-400">
              <input
                type="text"
                placeholder="e.g. market-maker-1"
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Calls backend <code>POST /accounts</code> to persist to PostgreSQL.
            </p>
          </div>

          {error && (
            <div className="p-2 rounded bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded bg-[#171b28] hover:bg-[#202534] text-xs text-zinc-400 font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newAccountId.trim()}
              className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
