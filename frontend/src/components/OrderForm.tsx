import React, { useState, useEffect } from 'react';
import type { OrderSide, OrderType, Order } from '../types/order';
import type { AccountData } from '../types/account';
import { generateOrderId } from '../utils/id';
import { formatPrice, formatQuantity } from '../utils/formatters';

interface OrderFormProps {
  symbol: string;
  accountId: string;
  accountData?: AccountData | null;
  lastPrice?: number;
  bestBid?: number;
  bestAsk?: number;
  selectedPrice?: number;
  onSubmitOrder: (order: Order) => Promise<{ success: boolean; error?: string }>;
  onOpenDepositModal?: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  symbol,
  accountId,
  accountData,
  lastPrice,
  bestBid,
  bestAsk,
  selectedPrice,
  onSubmitOrder,
  onOpenDepositModal,
}) => {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [priceInput, setPriceInput] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [maxQuoteAmountInput, setMaxQuoteAmountInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Update price when selected from order book
  useEffect(() => {
    if (selectedPrice !== undefined && selectedPrice > 0) {
      setPriceInput(selectedPrice.toFixed(2));
    }
  }, [selectedPrice]);

  // If price input is empty and we receive lastPrice or bestBid/bestAsk, suggest initial price
  useEffect(() => {
    if (!priceInput && lastPrice && lastPrice > 0) {
      setPriceInput(lastPrice.toFixed(2));
    }
  }, [lastPrice]);

  // Balances
  const btcAvailable = accountData?.balances?.BTC?.available ?? 0;
  const usdtAvailable = accountData?.balances?.USDT?.available ?? 0;
  const availableBalance = side === 'BUY' ? usdtAvailable : btcAvailable;
  const balanceCurrency = side === 'BUY' ? 'USDT' : 'BTC';

  // Calculate estimated total
  const numPrice = parseFloat(priceInput) || 0;
  const numQuantity = parseFloat(quantityInput) || 0;
  const estimatedTotal = numPrice * numQuantity;

  // Handle Percentage Quick Fill
  const handlePercentClick = (percent: number) => {
    if (side === 'BUY') {
      const targetUSDT = usdtAvailable * (percent / 100);
      if (orderType === 'MARKET') {
        setMaxQuoteAmountInput(targetUSDT.toFixed(2));
        if (numPrice > 0) {
          setQuantityInput((targetUSDT / numPrice).toFixed(6));
        }
      } else {
        if (numPrice > 0) {
          const qty = targetUSDT / numPrice;
          setQuantityInput(qty.toFixed(6));
        }
      }
    } else {
      const qty = btcAvailable * (percent / 100);
      setQuantityInput(qty.toFixed(6));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Client-side validations
    if (!accountId) {
      setFeedback({ type: 'error', message: 'Please select an active account first.' });
      return;
    }

    if (orderType === 'LIMIT' && (isNaN(numPrice) || numPrice <= 0)) {
      setFeedback({ type: 'error', message: 'Please enter a valid limit price greater than 0.' });
      return;
    }

    if (isNaN(numQuantity) || numQuantity <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid quantity greater than 0.' });
      return;
    }

    if (side === 'BUY' && estimatedTotal > usdtAvailable && orderType === 'LIMIT') {
      setFeedback({
        type: 'error',
        message: `Insufficient USDT balance. Needed: ${formatPrice(estimatedTotal)} USDT, Available: ${formatPrice(
          usdtAvailable
        )} USDT.`,
      });
      return;
    }

    if (side === 'SELL' && numQuantity > btcAvailable) {
      setFeedback({
        type: 'error',
        message: `Insufficient BTC balance. Needed: ${formatQuantity(
          numQuantity
        )} BTC, Available: ${formatQuantity(btcAvailable)} BTC.`,
      });
      return;
    }

    const orderPayload: Order = {
      id: generateOrderId(side.toLowerCase()),
      accountId,
      symbol,
      side,
      type: orderType,
      price: orderType === 'LIMIT' ? numPrice : (lastPrice || bestAsk || 0),
      quantity: numQuantity,
      ...(orderType === 'MARKET' && side === 'BUY' && maxQuoteAmountInput
        ? { maxQuoteAmount: parseFloat(maxQuoteAmountInput) }
        : {}),
    };

    setIsSubmitting(true);
    try {
      const result = await onSubmitOrder(orderPayload);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `${side} ${orderType} order submitted successfully!`,
        });
        setQuantityInput('');
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to submit order.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-[#10131c] border border-[#1e2330] rounded p-3 select-none flex flex-col justify-between">
      <div>
        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#161a25] border border-[#222838] rounded mb-3">
          <button
            type="button"
            onClick={() => {
              setSide('BUY');
              setFeedback(null);
            }}
            className={`py-1.5 rounded text-xs font-bold transition-all ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Buy BTC
          </button>
          <button
            type="button"
            onClick={() => {
              setSide('SELL');
              setFeedback(null);
            }}
            className={`py-1.5 rounded text-xs font-bold transition-all ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sell BTC
          </button>
        </div>

        {/* Order Type Toggle: LIMIT vs MARKET */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-1 bg-[#151924] border border-[#202534] rounded p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                orderType === 'LIMIT'
                  ? 'bg-[#222838] text-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Limit
            </button>
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                orderType === 'MARKET'
                  ? 'bg-[#222838] text-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Market
            </button>
          </div>

          {/* Available Balance Pill */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <span className="text-zinc-500">Avail:</span>
            <span className="text-zinc-200 font-bold tabular-nums">
              {side === 'BUY' ? formatPrice(usdtAvailable) : formatQuantity(btcAvailable, 4)}
            </span>
            <span className="text-[10px] text-zinc-500">{balanceCurrency}</span>
            {availableBalance <= 0 && onOpenDepositModal && (
              <button
                type="button"
                onClick={onOpenDepositModal}
                className="text-[10px] text-emerald-400 hover:underline font-sans ml-1"
              >
                +Deposit
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Price Input (if LIMIT) */}
          {orderType === 'LIMIT' ? (
            <div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>Limit Price</span>
                <div className="flex gap-1.5 text-zinc-400">
                  {bestBid !== undefined && (
                    <button
                      type="button"
                      onClick={() => setPriceInput(bestBid.toFixed(2))}
                      className="hover:text-emerald-400 transition-colors"
                    >
                      Bid
                    </button>
                  )}
                  {bestAsk !== undefined && (
                    <button
                      type="button"
                      onClick={() => setPriceInput(bestAsk.toFixed(2))}
                      className="hover:text-rose-400 transition-colors"
                    >
                      Ask
                    </button>
                  )}
                </div>
              </div>
              <div className="relative rounded bg-[#161a25] border border-[#222838] focus-within:border-zinc-500 transition-colors">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full bg-transparent px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none tabular-nums"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                  USDT
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded bg-[#161a25] border border-[#222838] text-xs text-zinc-400 flex items-center justify-between">
              <span>Execution Price</span>
              <span className="font-mono text-emerald-400 font-semibold">Best Market Price</span>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
              <span>Amount</span>
              <span>BTC</span>
            </div>
            <div className="relative rounded bg-[#161a25] border border-[#222838] focus-within:border-zinc-500 transition-colors">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="0.00"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className="w-full bg-transparent px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none tabular-nums"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                BTC
              </span>
            </div>
          </div>

          {/* Percentage Quick Fill Buttons */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentClick(pct)}
                className="py-1 rounded bg-[#161a25] hover:bg-[#202534] border border-[#222838] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Total Calculation */}
          <div className="py-2 px-2.5 rounded bg-[#12151f] border border-[#1d222f] flex items-center justify-between text-xs">
            <span className="text-zinc-500 text-[11px]">Estimated Total</span>
            <div className="font-mono text-zinc-200 font-bold tabular-nums">
              {formatPrice(estimatedTotal)} <span className="text-[10px] text-zinc-500 font-normal">USDT</span>
            </div>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div
              className={`p-2 rounded text-[11px] leading-tight font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                  : 'bg-rose-950/40 border border-rose-800/40 text-rose-400'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              side === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Order...
              </span>
            ) : side === 'BUY' ? (
              `Buy ${symbol.replace('USDT', '')}`
            ) : (
              `Sell ${symbol.replace('USDT', '')}`
            )}
          </button>
        </form>
      </div>

      <div className="mt-3 pt-2 border-t border-[#1a1f2b] flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <span>FIFO Matching</span>
        <span>No Taker Fee</span>
      </div>
    </section>
  );
};
