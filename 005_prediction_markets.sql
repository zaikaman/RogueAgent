-- Migration: 005_prediction_markets.sql
-- Description: Create prediction_markets_cache table for storing high-edge betting opportunities
-- Created: 2024-11-28

-- Create the prediction markets cache table
CREATE TABLE public.prediction_markets_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_id text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('Polymarket', 'Azuro', 'SX Network', 'Degen')),
  title text NOT NULL,
  description text,
  category text,
  yes_price numeric NOT NULL CHECK (yes_price >= 0 AND yes_price <= 1),
  implied_probability numeric NOT NULL CHECK (implied_probability >= 0 AND implied_probability <= 100),
  rogue_probability numeric CHECK (rogue_probability >= 0 AND rogue_probability <= 100),
  edge_percent numeric CHECK (edge_percent >= -100 AND edge_percent <= 100),
  recommended_bet text CHECK (recommended_bet IN ('BUY YES', 'BUY NO', 'HOLD')),
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  volume_usd numeric DEFAULT 0,
  liquidity_usd numeric DEFAULT 0,
  expiration_date timestamp with time zone,
  market_url text NOT NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  raw_data jsonb,
  analysis_reasoning text,
  last_analyzed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prediction_markets_cache_pkey PRIMARY KEY (id)
);

-- Create indexes for common queries
CREATE INDEX idx_prediction_markets_platform ON public.prediction_markets_cache(platform);
CREATE INDEX idx_prediction_markets_edge ON public.prediction_markets_cache(edge_percent DESC NULLS LAST);
CREATE INDEX idx_prediction_markets_active ON public.prediction_markets_cache(is_active) WHERE is_active = true;
CREATE INDEX idx_prediction_markets_confidence ON public.prediction_markets_cache(confidence_score DESC NULLS LAST);
CREATE INDEX idx_prediction_markets_updated ON public.prediction_markets_cache(updated_at DESC);

-- Create a function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_prediction_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER trigger_update_prediction_markets_updated_at
  BEFORE UPDATE ON public.prediction_markets_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_prediction_markets_updated_at();

-- Add RLS policies (optional, for row-level security)
ALTER TABLE public.prediction_markets_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users (adjust as needed)
CREATE POLICY "Allow read access to prediction markets"
  ON public.prediction_markets_cache
  FOR SELECT
  USING (true);

-- Allow full access for service role
CREATE POLICY "Allow service role full access to prediction markets"
  ON public.prediction_markets_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.prediction_markets_cache IS 'Cache for high-edge prediction market opportunities analyzed by Rogue AI';
COMMENT ON COLUMN public.prediction_markets_cache.edge_percent IS 'Difference between Rogue probability and market implied probability. Positive = undervalued, Negative = overvalued';
COMMENT ON COLUMN public.prediction_markets_cache.rogue_probability IS 'True probability as calculated by Rogue AI predictor agent';
COMMENT ON COLUMN public.prediction_markets_cache.recommended_bet IS 'AI recommendation: BUY YES, BUY NO, or HOLD';
