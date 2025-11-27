-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Add signal_jobs table for background processing
-- Enables async signal evaluation for custom agents to prevent Heroku timeouts
-- ═══════════════════════════════════════════════════════════════════════════════

-- Signal jobs table - tracks async signal processing for custom agents
CREATE TABLE IF NOT EXISTS public.signal_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_wallet_address text NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.futures_agents(id) ON DELETE CASCADE,
  signal_id text NOT NULL,
  signal_data jsonb NOT NULL, -- Full signal content for processing
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  
  -- Evaluation results (populated after processing)
  should_trade boolean,
  evaluation_reason text,
  evaluation_confidence integer,
  
  -- Trade execution results (if trade was placed)
  trade_id uuid REFERENCES public.futures_trades(id),
  trade_error text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  
  CONSTRAINT signal_jobs_pkey PRIMARY KEY (id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_signal_jobs_user_wallet 
ON public.signal_jobs(user_wallet_address);

CREATE INDEX IF NOT EXISTS idx_signal_jobs_agent 
ON public.signal_jobs(agent_id);

CREATE INDEX IF NOT EXISTS idx_signal_jobs_status 
ON public.signal_jobs(status) WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_signal_jobs_signal 
ON public.signal_jobs(signal_id);

CREATE INDEX IF NOT EXISTS idx_signal_jobs_created 
ON public.signal_jobs(created_at DESC);

-- Comment for documentation
COMMENT ON TABLE public.signal_jobs IS 
  'Tracks async signal processing jobs for custom futures agents to prevent HTTP timeouts';

COMMENT ON COLUMN public.signal_jobs.status IS 
  'pending: waiting to process, processing: LLM evaluating, completed: done (may or may not have traded), failed: error occurred, skipped: evaluation rejected';
