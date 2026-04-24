-- inventory schema — owned by the inventory bounded context

CREATE TABLE IF NOT EXISTS inventory.products (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT        NOT NULL CHECK (length(trim(product_name)) > 0),
  unit_price   INTEGER     NOT NULL CHECK (unit_price >= 0),  -- cents
  quantity     INTEGER     NOT NULL CHECK (quantity >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: three products
INSERT INTO inventory.products (id, product_name, unit_price, quantity)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'Pro Laptop 16"',            299999, 10),
  ('00000000-0000-0000-0001-000000000002', 'SmartPhone X',               99999, 25),
  ('00000000-0000-0000-0001-000000000003', 'Noise Cancelling Headset',   29999,  4)
ON CONFLICT (id) DO NOTHING;
