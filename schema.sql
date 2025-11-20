-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  wallet_address TEXT PRIMARY KEY,
  telegram_user_id BIGINT UNIQUE,
  telegram_username TEXT,
  tier TEXT NOT NULL DEFAULT 'NONE' CHECK (tier IN ('NONE', 'SILVER', 'GOLD', 'DIAMOND')),
  rge_balance_usd NUMERIC(12,2),
  last_verified_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_telegram ON users(telegram_user_id);

-- Create updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create runs table
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('signal', 'intel', 'skip')),
  content JSONB NOT NULL,
  public_posted_at TIMESTAMPTZ,
  telegram_delivered_at TIMESTAMPTZ,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
  cycle_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle_completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX idx_runs_type ON runs(type);

-- Create custom_requests table
CREATE TABLE custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  token_symbol TEXT NOT NULL,
  token_contract TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_result JSONB,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_custom_requests_user ON custom_requests(user_wallet_address, requested_at DESC);
CREATE INDEX idx_custom_requests_status ON custom_requests(status);

-- Create tier_snapshots table (optional analytics)
CREATE TABLE tier_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('SILVER', 'GOLD', 'DIAMOND')),
  delivered_at TIMESTAMPTZ NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tier_snapshots_run ON tier_snapshots(run_id);
