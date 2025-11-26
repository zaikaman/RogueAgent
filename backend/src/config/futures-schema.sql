-- ═══════════════════════════════════════════════════════════════════════════════
-- ROGUE FUTURES AGENTS - DATABASE SCHEMA
-- Supabase/PostgreSQL tables for Diamond-tier automated trading
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable pgcrypto extension for encryption (if not already enabled)
-- Note: On Supabase, pgcrypto is typically pre-enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENCRYPTED WALLET CREDENTIALS
-- Stores Hyperliquid wallet private keys with AES-256 encryption
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.futures_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_wallet_address text NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  encrypted_api_key text NOT NULL,
  encrypted_api_secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_tested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT futures_api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT futures_api_keys_wallet_unique UNIQUE (user_wallet_address)
);

-- Index for quick lookups by wallet
CREATE INDEX IF NOT EXISTS idx_futures_api_keys_wallet 
ON public.futures_api_keys(user_wallet_address);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUTURES AGENTS
-- Trading agents with custom prompts and risk parameters
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.futures_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_wallet_address text NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('classic', 'custom')),
  is_active boolean NOT NULL DEFAULT false,
  risk_per_trade numeric NOT NULL DEFAULT 1 CHECK (risk_per_trade >= 0.5 AND risk_per_trade <= 5),
  max_concurrent_positions integer NOT NULL DEFAULT 3 CHECK (max_concurrent_positions >= 1 AND max_concurrent_positions <= 10),
  max_leverage integer NOT NULL DEFAULT 20 CHECK (max_leverage >= 1 AND max_leverage <= 50),
  custom_prompt text,
  stats jsonb NOT NULL DEFAULT '{
    "total_trades": 0,
    "winning_trades": 0,
    "losing_trades": 0,
    "total_pnl_usd": 0,
    "total_pnl_percent": 0,
    "max_drawdown_percent": 0,
    "trades_today": 0,
    "last_trade_at": null
  }'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT futures_agents_pkey PRIMARY KEY (id)
);

-- Indexes for futures_agents
CREATE INDEX IF NOT EXISTS idx_futures_agents_wallet 
ON public.futures_agents(user_wallet_address);

CREATE INDEX IF NOT EXISTS idx_futures_agents_active 
ON public.futures_agents(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_futures_agents_type 
ON public.futures_agents(type);

-- Unique constraint: only one classic agent per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_futures_agents_classic_unique 
ON public.futures_agents(user_wallet_address) 
WHERE type = 'classic';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUTURES TRADES
-- Individual trade records with P&L tracking
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.futures_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.futures_agents(id) ON DELETE CASCADE,
  user_wallet_address text NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  signal_id text NOT NULL,
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price numeric NOT NULL,
  exit_price numeric,
  quantity numeric NOT NULL,
  leverage integer NOT NULL,
  risk_percent numeric NOT NULL,
  pnl_usd numeric,
  pnl_percent numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'tp_hit', 'sl_hit', 'closed', 'error')),
  entry_order_id text NOT NULL,
  tp_order_id text,
  sl_order_id text,
  error_message text,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  CONSTRAINT futures_trades_pkey PRIMARY KEY (id)
);

-- Indexes for futures_trades
CREATE INDEX IF NOT EXISTS idx_futures_trades_agent 
ON public.futures_trades(agent_id);

CREATE INDEX IF NOT EXISTS idx_futures_trades_wallet 
ON public.futures_trades(user_wallet_address);

CREATE INDEX IF NOT EXISTS idx_futures_trades_status 
ON public.futures_trades(status);

CREATE INDEX IF NOT EXISTS idx_futures_trades_opened 
ON public.futures_trades(opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_futures_trades_signal 
ON public.futures_trades(signal_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUTURES POSITIONS
-- Live position tracking (synced from Hyperliquid)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.futures_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_wallet_address text NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.futures_agents(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price numeric NOT NULL,
  current_price numeric NOT NULL,
  quantity numeric NOT NULL,
  leverage integer NOT NULL,
  unrealized_pnl numeric NOT NULL DEFAULT 0,
  unrealized_pnl_percent numeric NOT NULL DEFAULT 0,
  liquidation_price numeric NOT NULL,
  tp_price numeric,
  sl_price numeric,
  tp_order_id text,
  sl_order_id text,
  margin_type text NOT NULL DEFAULT 'isolated' CHECK (margin_type IN ('isolated', 'cross')),
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT futures_positions_pkey PRIMARY KEY (id),
  CONSTRAINT futures_positions_unique UNIQUE (user_wallet_address, symbol)
);

-- Indexes for futures_positions
CREATE INDEX IF NOT EXISTS idx_futures_positions_wallet 
ON public.futures_positions(user_wallet_address);

CREATE INDEX IF NOT EXISTS idx_futures_positions_agent 
ON public.futures_positions(agent_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Ensure users can only access their own data
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all futures tables
ALTER TABLE public.futures_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.futures_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.futures_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.futures_positions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.futures_api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.futures_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.futures_api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.futures_api_keys;

DROP POLICY IF EXISTS "Users can view their own agents" ON public.futures_agents;
DROP POLICY IF EXISTS "Users can insert their own agents" ON public.futures_agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON public.futures_agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.futures_agents;

DROP POLICY IF EXISTS "Users can view their own trades" ON public.futures_trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON public.futures_trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.futures_trades;

DROP POLICY IF EXISTS "Users can view their own positions" ON public.futures_positions;
DROP POLICY IF EXISTS "Users can manage their own positions" ON public.futures_positions;

-- Note: These policies are for service_role access
-- The backend uses service_role key which bypasses RLS
-- These policies are a safety net for direct database access

-- Create permissive policies for service_role (backend) access
-- Service role bypasses RLS automatically, but we keep these for documentation

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to update agent stats on trade changes
CREATE OR REPLACE FUNCTION update_agent_stats_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  agent_stats jsonb;
  total_trades integer;
  winning_trades integer;
  losing_trades integer;
  total_pnl_usd numeric;
  total_pnl_percent numeric;
  trades_today integer;
BEGIN
  -- Calculate stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE pnl_usd > 0),
    COUNT(*) FILTER (WHERE pnl_usd < 0),
    COALESCE(SUM(pnl_usd), 0),
    COALESCE(SUM(pnl_percent), 0),
    COUNT(*) FILTER (WHERE DATE(opened_at) = CURRENT_DATE)
  INTO total_trades, winning_trades, losing_trades, total_pnl_usd, total_pnl_percent, trades_today
  FROM public.futures_trades
  WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id);

  -- Build stats JSON
  agent_stats = jsonb_build_object(
    'total_trades', total_trades,
    'winning_trades', winning_trades,
    'losing_trades', losing_trades,
    'total_pnl_usd', total_pnl_usd,
    'total_pnl_percent', total_pnl_percent,
    'max_drawdown_percent', 0, -- Calculated separately
    'trades_today', trades_today,
    'last_trade_at', NOW()
  );

  -- Update agent
  UPDATE public.futures_agents
  SET stats = agent_stats, updated_at = NOW()
  WHERE id = COALESCE(NEW.agent_id, OLD.agent_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for trade stat updates
DROP TRIGGER IF EXISTS trigger_update_agent_stats ON public.futures_trades;
CREATE TRIGGER trigger_update_agent_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.futures_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_stats_on_trade();

-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANTS
-- Ensure service role has full access
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT ALL ON public.futures_api_keys TO service_role;
GRANT ALL ON public.futures_agents TO service_role;
GRANT ALL ON public.futures_trades TO service_role;
GRANT ALL ON public.futures_positions TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.futures_api_keys IS 'Encrypted Hyperliquid wallet credentials for Diamond-tier users';
COMMENT ON TABLE public.futures_agents IS 'Trading agents with custom prompts and risk parameters';
COMMENT ON TABLE public.futures_trades IS 'Individual trade records with P&L tracking';
COMMENT ON TABLE public.futures_positions IS 'Live position tracking synced from Hyperliquid';

COMMENT ON COLUMN public.futures_agents.type IS 'classic = auto-copy all signals, custom = LLM-evaluated';
COMMENT ON COLUMN public.futures_agents.custom_prompt IS 'Natural language trading rules for LLM evaluation';
COMMENT ON COLUMN public.futures_agents.stats IS 'JSON object containing performance statistics';
