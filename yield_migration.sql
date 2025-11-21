-- Create yield_opportunities table
CREATE TABLE yield_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id TEXT NOT NULL,
  protocol TEXT NOT NULL,
  chain TEXT NOT NULL,
  symbol TEXT NOT NULL,
  apy NUMERIC(10, 2) NOT NULL,
  tvl NUMERIC(20, 2) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Degen')),
  analysis TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yield_created_at ON yield_opportunities(created_at DESC);
