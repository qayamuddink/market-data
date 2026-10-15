import { useState } from 'react';
import { config } from './config';
import { useTradingApi } from './hooks/useTradingApi';
import type { Order } from './types/order';
import type { Asset } from './types/account';

import { Navbar } from './components/Navbar';
import { MarketHeader } from './components/MarketHeader';
import { PriceChart } from './components/PriceChart';
import { OrderBook } from './components/OrderBook';
import { RecentTrades } from './components/RecentTrades';
import { OrderForm } from './components/OrderForm';
import { OpenOrders } from './components/OpenOrders';
import { StatusBar } from './components/StatusBar';
import { DepositModal } from './components/DepositModal';
import { AccountModal } from './components/AccountModal';

export function App() {
  const [symbol] = useState<string>(config.defaultSymbol);
  const [activeAccount, setActiveAccount] = useState<string>('api-account-1');
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>(undefined);

  // Modals state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);

  // Unified REST & WebSocket hook
  const {
    orderBook,
    trades,
    orders,
    ticker,
    prevPrice,
    accountData,
    isLoadingMarket,
    isLoadingAccount,
    apiError,
    wsConnected,
    wsStatus,
    submitOrder,
    cancelOrder,
    deposit,
    createAccount,
  } = useTradingApi({
    symbol,
    accountId: activeAccount,
    pollInterval: 10000,
  });

  // Calculate session High / Low from real observed trades
  const { sessionHigh, sessionLow } = trades.reduce(
    (acc, t) => ({
      sessionHigh: acc.sessionHigh ? Math.max(acc.sessionHigh, t.price) : t.price,
      sessionLow: acc.sessionLow ? Math.min(acc.sessionLow, t.price) : t.price,
    }),
    { sessionHigh: undefined as number | undefined, sessionLow: undefined as number | undefined }
  );

  const handleSubmitOrder = async (order: Order) => {
    return await submitOrder(order);
  };

  const handleCancelOrder = async (orderId: string) => {
    return await cancelOrder(orderId);
  };

  const handleDeposit = async (accId: string, asset: Asset, amount: number) => {
    return await deposit(accId, asset, amount);
  };

  const handleCreateAccount = async (accId: string) => {
    return await createAccount(accId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-[#d1d4dc] font-sans">
      {/* Top Navigation */}
      <Navbar
        symbol={symbol}
        wsConnected={wsConnected}
        wsStatusText={wsStatus}
        accountId={activeAccount}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenDepositModal={() => setIsDepositModalOpen(true)}
      />

      {/* Market Ticker Bar */}
      <MarketHeader
        symbol={symbol}
        lastPrice={ticker.lastPrice}
        prevPrice={prevPrice}
        bestBid={ticker.bestBid}
        bestAsk={ticker.bestAsk}
        highPrice={sessionHigh}
        lowPrice={sessionLow}
        tradeCount={trades.length}
      />

      {/* Main Trading Terminal Layout Grid */}
      <main className="flex-1 p-2 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
        {/* Left Column: Price Chart & Open Orders (8 Cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-2 min-h-0">
          {/* Dedicated Price Chart Panel */}
          <PriceChart
            symbol={symbol}
            trades={trades}
            lastPrice={ticker.lastPrice}
            isLoading={isLoadingMarket && trades.length === 0}
            error={apiError}
          />

          {/* Bottom Tabs: Open Orders, Portfolio Balances, Order History */}
          <OpenOrders
            orders={orders}
            accountId={activeAccount}
            accountData={accountData}
            onCancelOrder={handleCancelOrder}
            onOpenDepositModal={() => setIsDepositModalOpen(true)}
            isLoading={isLoadingAccount && orders.length === 0}
          />
        </div>

        {/* Right Column: Order Entry Form, Order Book, Recent Trades (4 Cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-2 min-h-0">
          {/* Order Entry Form */}
          <OrderForm
            symbol={symbol}
            accountId={activeAccount}
            accountData={accountData}
            lastPrice={ticker.lastPrice}
            bestBid={ticker.bestBid}
            bestAsk={ticker.bestAsk}
            selectedPrice={selectedPrice}
            onSubmitOrder={handleSubmitOrder}
            onOpenDepositModal={() => setIsDepositModalOpen(true)}
          />

          {/* Order Book Panel */}
          <OrderBook
            orderBook={orderBook}
            lastPrice={ticker.lastPrice}
            onSelectPrice={(price) => setSelectedPrice(price)}
            isLoading={isLoadingMarket && orderBook.bids.length === 0 && orderBook.asks.length === 0}
          />

          {/* Recent Trades Panel */}
          <RecentTrades
            trades={trades}
            isLoading={isLoadingMarket && trades.length === 0}
          />
        </div>
      </main>

      {/* Terminal Status Bar */}
      <StatusBar
        wsConnected={wsConnected}
        orderCount={orders.length}
        tradeCount={trades.length}
      />

      {/* Modals */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        accountId={activeAccount}
        onDeposit={handleDeposit}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentAccountId={activeAccount}
        onSelectAccount={(acc) => setActiveAccount(acc)}
        onCreateAccount={handleCreateAccount}
      />
    </div>
  );
}

export default App;
