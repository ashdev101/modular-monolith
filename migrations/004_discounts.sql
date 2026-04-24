-- discounts schema — owned by the discounts bounded context

CREATE TABLE IF NOT EXISTS discounts.codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE CHECK (code = upper(code)),
  percentage  INTEGER     NOT NULL CHECK (percentage BETWEEN 1 AND 100),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  max_usage   INTEGER     CHECK (max_usage > 0),  -- NULL = unlimited
  usage_count INTEGER     NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codes_code ON discounts.codes (code);

-- Seed discount codes
INSERT INTO discounts.codes (id, code, percentage, is_active, expires_at, max_usage, usage_count)
VALUES
  ('00000000-0000-0000-0002-000000000001', 'SAVE10', 10, TRUE, NULL,                                          NULL, 0),
  ('00000000-0000-0000-0002-000000000002', 'VIP20',  20, TRUE, NOW() + INTERVAL '30 days',                    NULL, 0),
  ('00000000-0000-0000-0002-000000000003', 'FLASH5',  5, TRUE, NULL,                                          3,    0)
ON CONFLICT (id) DO NOTHING;
