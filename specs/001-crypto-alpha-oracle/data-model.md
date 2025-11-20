# Data Model: Rogue Crypto Alpha Oracle

**Purpose**: Define Supabase PostgreSQL schema for runs, signals, intel threads, users, and custom requests
**Created**: 2025-11-20
**Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Entity Relationship Overview

```
users (wallet_address PK)
  ↓ 1:N
custom_requests (id PK, user_wallet_address FK)

runs (id PK)
  ↓ 1:1
signals (run_id FK) OR intel_threads (run_id FK)

runs ← tier_snapshots (many-to-many tracking which tiers saw which run)
```

---

## Schema Definitions

### Table: `runs`

**Purpose**: Central log of every 20-minute execution cycle, regardless of output type (signal, intel, or skip).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique run identifier |
| `type` | TEXT | NOT NULL, CHECK (type IN ('signal', 'intel', 'skip')) | Output type for this run |
| `content` | JSONB | NOT NULL | Full signal or intel thread data (schema below) |
| `public_posted_at` | TIMESTAMPTZ | NULL | When posted to public X/Twitter (NULL if not yet posted) |
| `telegram_delivered_at` | TIMESTAMPTZ | NULL | When delivered to Telegram private channel (NULL if not delivered) |
| `confidence_score` | INTEGER | NULL, CHECK (confidence_score BETWEEN 1 AND 10) | Only for signals, NULL for intel/skip |
| `cycle_started_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When this 20-min cycle began |
| `cycle_completed_at` | TIMESTAMPTZ | NULL | When swarm execution finished (NULL if still running) |
| `execution_time_ms` | INTEGER | NULL | Total swarm execution time in milliseconds |
| `error_message` | TEXT | NULL | If cycle failed, error details stored here |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Row creation timestamp |

**Indexes**:
- `idx_runs_created_at` on `created_at DESC` (for latest runs query)
- `idx_runs_type` on `type` (for filtering by signal/intel)

**Sample `content` JSONB for Signal**:
```json
{
  "token": {
    "symbol": "BONK",
    "name": "Bonk",
    "contract_address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  },
  "entry_price": 0.0000085,
  "target_price": 0.0000120,
  "stop_loss": 0.0000070,
  "confidence": 8,
  "trigger_event": {
    "type": "kol_mention",
    "kol_handle": "@cryptowhale",
    "tweet_url": "https://twitter.com/cryptowhale/status/123456",
    "whale_wallets": ["7xKXtg2CW..."]
  },
  "analysis": "Bonk seeing unusual volume spike...",
  "formatted_tweet": "🚀 $BONK SIGNAL\n\nEntry: $0.0000085..."
}
```

**Sample `content` JSONB for Intel Thread**:
```json
{
  "narrative": "Solana DePIN tokens heating up",
  "insights": [
    "Helium (HNT) up 45% this week",
    "Major VC rounds announced for Render, Hivemapper",
    "KOL @solana pumping DePIN category"
  ],
  "data_points": {
    "mindshare_surge": "+230% Twitter mentions",
    "whale_activity": "3 new wallets > $100k positions",
    "sentiment_score": 0.78
  },
  "formatted_thread": "🔥 NARRATIVE ALERT: Solana DePIN is cooking\n\n1/ ..."
}
```

---

### Table: `users`

**Purpose**: Track verified users, their wallet addresses, tier status, and Telegram association.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `wallet_address` | TEXT | PRIMARY KEY | Solana wallet public key (base58) |
| `telegram_user_id` | BIGINT | UNIQUE, NULL | Telegram user ID from Bot API |
| `telegram_username` | TEXT | NULL | Telegram @username for display |
| `tier` | TEXT | NOT NULL, DEFAULT 'NONE', CHECK (tier IN ('NONE', 'SILVER', 'GOLD', 'DIAMOND')) | Current tier based on last verification |
| `rge_balance_usd` | NUMERIC(12,2) | NULL | Last known $RGE holdings in USD |
| `last_verified_at` | TIMESTAMPTZ | NULL | Last on-chain wallet verification timestamp |
| `joined_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | First verification timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update to tier or balance |

**Indexes**:
- `idx_users_tier` on `tier` (for tier-based queries)
- `idx_users_telegram` on `telegram_user_id` (for bot lookups)

**Triggers**:
- `update_users_updated_at` BEFORE UPDATE → sets `updated_at = now()`

**Notes**:
- Tier is cached from last verification (fallback if RPC fails)
- `rge_balance_usd` updated every verification to track holdings history
- If user sells $RGE and drops tier, `tier` column updated on next verification

---

### Table: `custom_requests`

**Purpose**: Diamond tier users can request one custom token analysis per day.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique request identifier |
| `user_wallet_address` | TEXT | NOT NULL, FOREIGN KEY REFERENCES users(wallet_address) ON DELETE CASCADE | Requesting user |
| `token_symbol` | TEXT | NOT NULL | Token to analyze (e.g., "BONK", "JUP") |
| `token_contract` | TEXT | NULL | Optional contract address for precision |
| `status` | TEXT | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'processing', 'completed', 'failed')) | Request lifecycle state |
| `analysis_result` | JSONB | NULL | Generated analysis (same schema as intel content) |
| `delivered_at` | TIMESTAMPTZ | NULL | When privately sent to Telegram |
| `error_message` | TEXT | NULL | If analysis failed, reason stored here |
| `requested_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Request submission timestamp |
| `completed_at` | TIMESTAMPTZ | NULL | When analysis finished (success or failure) |

**Indexes**:
- `idx_custom_requests_user` on `user_wallet_address, requested_at DESC` (for quota checks)
- `idx_custom_requests_status` on `status` (for processing queue)

**Constraints**:
- **Daily quota enforcement**: Application logic checks last 24 hours of requests per user
- **Diamond tier only**: Enforced in application layer (verify tier before accepting request)

**Sample `analysis_result` JSONB**:
```json
{
  "token": "JUP",
  "analysis": "Jupiter aggregator seeing increased DEX volume...",
  "metrics": {
    "24h_volume": "$45M",
    "holder_count": 125000,
    "sentiment": 0.65
  },
  "recommendation": "HOLD - stable fundamentals, no immediate catalyst"
}
```

---

### Table: `tier_snapshots` (Optional - Analytics)

**Purpose**: Track which tiers received early access for each run (for analytics and audit).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique snapshot identifier |
| `run_id` | UUID | NOT NULL, FOREIGN KEY REFERENCES runs(id) ON DELETE CASCADE | Associated run |
| `tier` | TEXT | NOT NULL, CHECK (tier IN ('SILVER', 'GOLD', 'DIAMOND')) | Tier that received early access |
| `delivered_at` | TIMESTAMPTZ | NOT NULL | When content was delivered to this tier |
| `recipient_count` | INTEGER | NOT NULL, DEFAULT 0 | Number of users in this tier at delivery time |

**Indexes**:
- `idx_tier_snapshots_run` on `run_id`

**Usage**:
- Populated by `PublisherAgent` when delivering early content
- Enables analytics: "Gold tier users saw this 28 minutes before public"
- Not required for MVP but useful for demonstrating value

---

## Relationships

```sql
-- Foreign key relationships
ALTER TABLE custom_requests
  ADD CONSTRAINT fk_custom_requests_user
  FOREIGN KEY (user_wallet_address)
  REFERENCES users(wallet_address)
  ON DELETE CASCADE;

ALTER TABLE tier_snapshots
  ADD CONSTRAINT fk_tier_snapshots_run
  FOREIGN KEY (run_id)
  REFERENCES runs(id)
  ON DELETE CASCADE;
```

---

## Row-Level Security (RLS)

Supabase requires RLS policies for secure client access. **For MVP, disable RLS** since frontend never directly queries database (all access via backend API with service role key).

**Future Production RLS Policies** (if enabling direct Supabase client access):

```sql
-- Users can only read their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.jwt() ->> 'wallet_address' = wallet_address);

-- Anyone can view public runs
CREATE POLICY "Anyone can view runs"
  ON runs FOR SELECT
  USING (true);

-- Only authenticated Diamond tier users can create custom requests
CREATE POLICY "Diamond tier can create requests"
  ON custom_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE wallet_address = custom_requests.user_wallet_address
      AND tier = 'DIAMOND'
    )
  );
```

For MVP: **Disable RLS entirely** and rely on backend service role key for all database operations.

---

## Migrations

**Supabase Migration Script** (`migrations/001_initial_schema.sql`):

```sql
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
```

**Run Migration**:
```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase dashboard → SQL Editor → paste migration script
```

---

## Data Retention & Cleanup

**MVP Strategy**: No automatic cleanup (500MB Supabase free tier can hold ~100k runs = 3.8 years at current scale).

**Future Production**:
- Archive runs older than 90 days to cold storage (Supabase Storage or S3)
- Delete tier_snapshots older than 30 days (analytics only)
- Retain custom_requests for 30 days after completion

---

## Sample Queries

**Get latest 10 runs**:
```sql
SELECT id, type, content->>'formatted_tweet' AS tweet, created_at
FROM runs
WHERE type IN ('signal', 'intel')
ORDER BY created_at DESC
LIMIT 10;
```

**Check user's daily custom request quota**:
```sql
SELECT COUNT(*) AS requests_today
FROM custom_requests
WHERE user_wallet_address = 'ABC123...'
  AND requested_at > now() - INTERVAL '24 hours';
```

**Get signals with win rate > 60%**:
```sql
-- Requires outcome tracking (future enhancement)
SELECT 
  content->>'token'->>'symbol' AS token,
  confidence_score,
  -- outcome logic here
FROM runs
WHERE type = 'signal';
```

---

## Validation & Type Safety

All TypeScript types in `backend/src/types/` must match this schema:

```typescript
// signal.types.ts
export type Run = {
  id: string;
  type: 'signal' | 'intel' | 'skip';
  content: SignalContent | IntelContent;
  public_posted_at: string | null;
  telegram_delivered_at: string | null;
  confidence_score: number | null;
  cycle_started_at: string;
  cycle_completed_at: string | null;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export type SignalContent = {
  token: {
    symbol: string;
    name: string;
    contract_address: string;
  };
  entry_price: number;
  target_price: number;
  stop_loss: number;
  confidence: number;
  trigger_event: TriggerEvent;
  analysis: string;
  formatted_tweet: string;
};

export type Tier = 'NONE' | 'SILVER' | 'GOLD' | 'DIAMOND';
```

Use Zod for runtime validation:
```typescript
import { z } from 'zod';

export const RunSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['signal', 'intel', 'skip']),
  content: z.any(), // Union of SignalContent | IntelContent
  // ... rest of fields
});
```

---

## Schema Complete

All entities defined with relationships, indexes, and constraints. Ready for API contract definition (Phase 1 contracts).
