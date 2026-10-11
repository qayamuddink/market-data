
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE balances (
    account_id TEXT NOT NULL REFERENCES accounts(id),
    asset TEXT NOT NULL,
    available NUMERIC NOT NULL DEFAULT 0 CHECK (available >= 0),
    locked NUMERIC NOT NULL DEFAULT 0 CHECK (locked >= 0),

    PRIMARY KEY (account_id, asset)
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type TEXT NOT NULL CHECK (type IN ('LIMIT', 'MARKET')),
    price NUMERIC NOT NULL,
    original_quantity NUMERIC NOT NULL CHECK (original_quantity > 0),
    remaining_quantity NUMERIC NOT NULL CHECK (remaining_quantity >= 0),
    max_quote_amount NUMERIC,
    status TEXT NOT NULL CHECK (
        status IN (
            'OPEN',
            'PARTIALLY_FILLED',
            'FILLED',
            'CANCELLED',
            'REJECTED'
        )
    ),
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_account_timestamp
    ON orders (account_id, timestamp_ms DESC);

CREATE INDEX idx_orders_active
    ON orders (symbol, status, side, price, timestamp_ms)
    WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price > 0),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    buy_order_id TEXT NOT NULL REFERENCES orders(id),
    sell_order_id TEXT NOT NULL REFERENCES orders(id),
    buy_account_id TEXT NOT NULL REFERENCES accounts(id),
    sell_account_id TEXT NOT NULL REFERENCES accounts(id),
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_symbol_timestamp
    ON trades (symbol, timestamp_ms DESC);

CREATE TABLE deposits (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    asset TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL CHECK (
        status IN ('PENDING', 'COMPLETED', 'FAILED')
    ),
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
