export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
  defaultSymbol: 'BTCUSDT',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
} as const;
