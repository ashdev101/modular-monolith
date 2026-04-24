-- orders schema — owned by the orders bounded context

CREATE TABLE IF NOT EXISTS orders.orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL,   -- no FK to customers.customers (module boundary)
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','confirmed','shipped','cancelled','refunded')),
  total_cents   INTEGER     NOT NULL CHECK (total_cents >= 0),
  currency      CHAR(3)     NOT NULL DEFAULT 'USD',
  discount_code TEXT,
  discount_pct  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No FK to customers.customers — cross-module FK is a physical coupling
-- that makes schema extraction in Phase 3 impossible.
-- Data integrity is enforced via event-driven consistency instead.

CREATE TABLE IF NOT EXISTS orders.order_items (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID    NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
  product_id   UUID    NOT NULL,   -- no FK to inventory.products (module boundary)
  product_name TEXT    NOT NULL,   -- snapshot at order time, not a live join
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   INTEGER NOT NULL CHECK (unit_price >= 0)   -- snapshot in cents
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON orders.order_items (order_id);
