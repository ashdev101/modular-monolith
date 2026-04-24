-- customers schema — owned by the customers bounded context

CREATE TABLE IF NOT EXISTS customers.customers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL CHECK (length(trim(name)) >= 2),
  email          TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
  is_vip         BOOLEAN     NOT NULL DEFAULT FALSE,
  vip_granted_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers.customers (email);

-- Seed: two customers for immediate API use
INSERT INTO customers.customers (id, name, email, is_vip, vip_granted_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice VIP',    'alice@example.com', TRUE,  NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Bob Regular',  'bob@example.com',   FALSE, NULL,  NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
