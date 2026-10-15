# Crypto Exchange — Frontend Trading Terminal

A professional, high-performance cryptocurrency trading interface built for the `market-data` in-memory exchange and matching engine.

Inspired by industry-standard crypto exchange terminals, this interface features real-time order book depth visualization, live trade tick streams, dual-sided order entry (Limit & Market), account portfolio balances, open order management, and WebSocket push updates.

---

## 1. Technology Stack

* **Core Runtime & Tooling**: [Bun](https://bun.com) & [Vite 8](https://vite.dev)
* **UI Framework**: [React 19](https://react.dev) with [TypeScript](https://www.typescriptlang.org)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
* **Networking**:
  * **Native Fetch API** for REST operations centralized in `src/services/api.ts`
  * **Native WebSocket API** with auto-reconnection and channel dispatch in `src/services/websocket.ts`
* **Zero Bloat**: No Redux, Zustand, Recoil, or charting libraries. Lightweight HTML5 Canvas live price stream with zero heavy charting overhead.

---

## 2. Directory Structure

```text
market-data/
├── src/                          # Backend application
│   ├── account/                  # Account & asset management
│   ├── api/                      # Express HTTP server & WS server
│   ├── database/                 # PostgreSQL persistence layer
│   ├── exchange/                 # OrderManager & Exchange core
│   ├── market/                   # OrderBook, matching engine, precision
│   └── settlement/               # Balance reservations & settlement
└── frontend/                     # Separate Frontend application
    ├── src/
    │   ├── components/           # UI Components
    │   │   ├── Navbar.tsx        # Top nav, market selector, WS badge, account pill
    │   │   ├── MarketHeader.tsx  # Ticker bar, last price, spread, session bounds
    │   │   ├── PriceChart.tsx    # Canvas live price tick visualizer & crosshair
    │   │   ├── OrderBook.tsx     # 2-sided book with visual depth bars & spread
    │   │   ├── RecentTrades.tsx  # Executed trades stream with price tick colors
    │   │   ├── OrderForm.tsx     # Limit/Market order entry form with presets
    │   │   ├── OpenOrders.tsx    # Tabbed Open Orders, Balances, & History
    │   │   ├── DepositModal.tsx  # Modal to deposit test funds into accounts
    │   │   ├── AccountModal.tsx  # Modal to switch or create dev accounts
    │   │   └── StatusBar.tsx     # Terminal footer with system metrics
    │   ├── hooks/
    │   │   ├── useTradingApi.ts  # Unified REST & WebSocket data reconciliation hook
    │   │   └── useWebSocket.ts   # Reusable WebSocket subscription hook
    │   ├── services/
    │   │   ├── api.ts            # Centralized typed HTTP API client
    │   │   └── websocket.ts      # Resilient WebSocket client manager with backoff
    │   ├── types/
    │   │   ├── account.ts        # Account, Balance, Deposit types
    │   │   ├── market.ts         # OrderBook, PriceLevel, Ticker types
    │   │   ├── order.ts          # Order, ManagedOrder, Trade types
    │   │   └── websocket.ts      # Client & Server WS protocol definitions
    │   ├── utils/
    │   │   ├── formatters.ts     # Safe financial precision formatting
    │   │   └── id.ts             # Order and account ID generator
    │   ├── config.ts             # Environment configuration (API proxy, WS URL)
    │   ├── App.tsx               # Main layout and terminal grid assembly
    │   ├── main.tsx              # React DOM entry point
    │   └── index.css             # Tailwind v4 theme & terminal typography
    ├── .env                      # Local environment settings
    ├── .env.example              # Example environment template
    ├── package.json              # Frontend package configuration
    ├── tsconfig.json             # TypeScript configuration
    └── vite.config.ts            # Vite proxy configuration (/api -> :3000)
```

---

## 3. Running Locally

### Step 1: Start the Backend Exchange Server
From the root `market-data/` directory:
```bash
bun run src/server.ts
```
* **HTTP API Server**: Runs on port `3000` (`http://localhost:3000`)
* **WebSocket Server**: Runs on port `8080` (`ws://localhost:8080`)

### Step 2: Start the Frontend Application
In a separate terminal, navigate to `market-data/frontend/`:
```bash
cd frontend
bun install
bun run dev
```
Open **`http://localhost:5173`** in your browser.

### Step 3: Run Verification Scripts
* **Type-check**:
  ```bash
  bun run typecheck
  ```
* **Production Build**:
  ```bash
  bun run build
  ```
* **Run Backend Test Suite**:
  ```bash
  cd .. && bun test
  ```

---

## 4. Backend Integration Contract

### HTTP REST API Endpoints (Proxied via `/api`)
Vite proxies all `/api/*` calls to `http://localhost:3000/*` with path rewriting to prevent browser CORS restrictions without changing backend server code:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/accounts` | Create an account (`{"accountId": string}`). |
| `GET` | `/api/accounts/:accountId` | Retrieve account balance breakdown (`BTC` & `USDT`). |
| `POST` | `/api/accounts/:accountId/deposit` | Deposit funds (`{"asset": "BTC" \| "USDT", "amount": number}`). |
| `GET` | `/api/orderbook` | Retrieve current resting bids and asks snapshot. |
| `GET` | `/api/trades?symbol=BTCUSDT` | Retrieve executed trades for symbol. |
| `GET` | `/api/ticker?symbol=BTCUSDT` | Retrieve latest price, best bid, best ask. |
| `POST` | `/api/orders` | Place a `LIMIT` or `MARKET` order. |
| `GET` | `/api/orders` | Retrieve all managed orders from in-memory engine. |
| `DELETE`| `/api/orders/:orderId` | Cancel a resting open order and unlock balances. |

### WebSocket Real-Time Protocol (`ws://localhost:8080`)
* **Subscribe**:
  ```json
  { "type": "subscribe", "channel": "orderbook" | "trades" | "ticker" | "orders", "symbol"?: "BTCUSDT", "accountId"?: "usr-1" }
  ```
* **Instant Snapshot**:
  On subscribing to `orderbook`, server immediately pushes `{ "type": "orderbook", "symbol": "BTCUSDT", "orderBook": { "bids": [...], "asks": [...] } }`.
* **Broadcast Events**:
  * `orderbook`: Broadcasts updated book on every placement, match, or cancellation.
  * `trade`: Broadcasts executed trades.
  * `ticker`: Broadcasts updated `lastPrice`, `bestBid`, and `bestAsk`.
  * `order`: Broadcasts order updates (`FILLED`, `CANCELLED`, `PARTIALLY_FILLED`) to `orders:${accountId}` subscribers.

---

## 5. Financial Precision Rules

* **Base Asset (`BTC`)**: Scaled by `100,000,000` (8 decimal places). Standard satoshi precision.
* **Quote Asset (`USDT`)**: Scaled by `100` (2 decimal places). Standard cent precision.
* **Price (`USDT`)**: Scaled by `100` (2 decimal places).
* **Source of Truth**: The frontend never assumes order success or balances locally; it submits requests to the backend and automatically reconciles state against backend responses and WebSocket push events.

---

## 6. Documented Backend Capabilities & Architectural Gaps

1. **No Historical Candlesticks (OHLCV)**:
   * The backend does not maintain historical candlestick buckets (`1m`, `5m`, `1h`, etc.).
   * *Resolution*: The frontend does not invent or simulate fake candles. It renders a clean, real-time price tick curve from actual executed trades and ticker ticks received from the backend.
2. **Missing 24-Hour Exchange Statistics**:
   * The backend ticker only supplies `lastPrice`, `bestBid`, and `bestAsk`. It does not calculate 24h volume, 24h high/low, or 24h percent change.
   * *Resolution*: 24h change is explicitly marked `N/A (Backend Limit)`. Session High and Low are dynamically tracked from verified trades observed during the user's active session.
3. **Trade Direction (Taker Side)**:
   * The backend `ExecuteTrade` struct does not store taker side (`BUY` vs `SELL`).
   * *Resolution*: Trade colors are derived strictly from price movement relative to the preceding executed trade (tick-up = green, tick-down = red, equal = neutral).
4. **PostgreSQL Persistence vs In-Memory Engine**:
   * Account IDs are persisted to PostgreSQL (`accounts` table).
   * Order book state, order management, executed trades, and deposits currently run in-memory within the engine lifecycle. If the backend restarts, account IDs survive from PostgreSQL, while resting order book state and in-memory order history reset.
