# Research: Rogue Crypto Alpha Oracle

**Purpose**: Resolve technical unknowns and establish best practices for implementation
**Created**: 2025-11-20
**Plan**: [plan.md](./plan.md)

## Research Areas

### 1. ADK-TS Agent Swarm Architecture

**Decision**: Use ADK-TS (Agent Development Kit for TypeScript) with 5 specialized agents running on `gpt-5-nano-2025-08-07` model for cost efficiency and speed.

**Rationale**: 
- ADK-TS provides structured multi-agent orchestration with built-in message passing and state management
- `gpt-5-nano-2025-08-07` offers fast inference (<2s response) and low cost ($0.15/1M tokens) compared to larger models
- Separation of concerns: each agent has single responsibility (Scanner, Analyzer, Generator, Publisher, Tier Manager)
- Agents can run sequentially in 20-minute window: Scan → Analyze → Generate → Publish → Tier-gate (total ~30-60 seconds execution)

**Implementation Pattern**:
```typescript
// backend/src/agents/orchestrator.ts
import { AgentOrchestrator } from '@microsoft/adk';

const orchestrator = new AgentOrchestrator({
  agents: [
    new ScannerAgent(),    // Collects data from CoinGecko, TwitterAPI, Moralis
    new AnalyzerAgent(),   // Detects patterns, calculates confidence scores
    new GeneratorAgent(),  // Creates signal or intel thread content
    new PublisherAgent(),  // Posts to X and Telegram with tier delays
    new TierManagerAgent() // Verifies wallets, enforces access rules
  ],
  model: 'gpt-5-nano-2025-08-07',
  maxConcurrency: 1 // Sequential execution for deterministic flow
});

// Triggered by POST /api/run from Cron-Job.org
async function executeSwarm() {
  const context = { timestamp: Date.now(), cycle: 'automated' };
  const result = await orchestrator.run(context);
  await saveToSupabase(result);
  return result;
}
```

**Alternatives Considered**:
- **Single monolithic agent**: Rejected due to complexity of managing all responsibilities in one prompt (would exceed context limits and reduce modularity)
- **LangChain/LangGraph**: Rejected due to heavier dependency footprint and Python preference (we need TypeScript)
- **OpenAI Assistants API**: Rejected due to cost ($20/mo base + token costs) vs ADK-TS open-source

**Best Practices**:
- Each agent has explicit input/output types defined in `/types`
- Use Zod for runtime validation of agent responses
- Implement timeout per agent (10 seconds max) to stay within 20-minute window
- Log all agent executions to Supabase for debugging and performance tracking

---

### 2. Solana RPC Integration for Real-Time Wallet Verification

**Decision**: Use Solana web3.js library with public RPC endpoints (Solana mainnet-beta) to verify $RGE token holdings in real-time. Fall back to cached tier on RPC failure.

**Rationale**:
- Real-time verification ensures tier accuracy (users can't game the system by borrowing $RGE temporarily)
- Public RPC endpoints are free but may have rate limits (~100 req/min)
- SPL Token program allows querying token account balances by wallet address
- 5-second timeout per verification (SC-002 requirement) achievable with public RPC

**Implementation Pattern**:
```typescript
// backend/src/services/solana.service.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const RGE_MINT_ADDRESS = 'YOUR_RGE_TOKEN_MINT_ADDRESS';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

async function verifyWalletTier(walletAddress: string): Promise<Tier> {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const wallet = new PublicKey(walletAddress);
  
  // Get token accounts for this wallet
  const tokenAccounts = await connection.getTokenAccountsByOwner(wallet, {
    mint: new PublicKey(RGE_MINT_ADDRESS)
  });
  
  if (tokenAccounts.value.length === 0) return 'NONE';
  
  // Get balance from first account
  const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  
  // Convert $RGE amount to USD using cached CoinGecko price
  const rgePrice = await getCachedRGEPrice(); // Cached for 5 minutes
  const usdValue = balance * rgePrice;
  
  // Determine tier
  if (usdValue >= 5000) return 'DIAMOND';
  if (usdValue >= 500) return 'GOLD';
  if (usdValue >= 50) return 'SILVER';
  return 'NONE';
}
```

**Alternatives Considered**:
- **Moralis Solana API**: Free tier allows 40k requests/month (~1300/day), sufficient for MVP. Provides cleaner API but adds external dependency. **Recommended for production** to avoid RPC rate limits.
- **Helius RPC**: Paid service ($50/mo) with guaranteed uptime. Rejected for hackathon MVP (cost constraint).
- **On-chain program**: Could deploy Solana program to batch-verify tiers, but adds complexity and audit requirements. Rejected.

**Best Practices**:
- Cache $RGE price from CoinGecko for 5 minutes to reduce API calls
- Implement retry logic with exponential backoff (3 attempts, 1s/2s/4s delays)
- Store last verified tier in Supabase `users` table as fallback
- If RPC timeout occurs, use cached tier and flag for re-verification on next cycle

**RPC Rate Limit Mitigation**:
- Batch verification: only verify users actively requesting early access (don't verify all Telegram members every cycle)
- Use Moralis API for production (free tier sufficient)
- Implement request queue with rate limiting (max 50 verifications per cycle)

---

### 3. Free-Tier Deployment Strategy

**Decision**: Deploy frontend to Vercel (free tier: unlimited bandwidth, edge network), backend to Heroku (free dyno: sleeps after 30min, 550 hours/month), Supabase for database (free tier: 500MB storage, 2GB bandwidth). Use Cron-Job.org (free: 50 cron jobs) to keep Heroku awake and trigger runs.

**Rationale**:
- **Vercel**: Best-in-class frontend hosting with global CDN, instant deploys, zero config for Vite
- **Heroku**: Supports Node.js with buildpacks, free tier sufficient for 72 runs/day (20-min cycles)
- **Supabase**: PostgreSQL with generous free tier (500MB = ~100k runs at 5KB/run)
- **Cron-Job.org**: External cron service pings `POST /api/run` every 20 minutes to trigger swarm and prevent dyno sleep

**Implementation Details**:

**Heroku Deployment**:
```bash
# Procfile
web: node dist/index.js

# package.json scripts
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}

# Environment variables (Heroku config vars)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=xxx
TWITTER_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
RGE_MINT_ADDRESS=xxx
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Vercel Deployment**:
```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-heroku-app.herokuapp.com/api/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

**Cron-Job.org Configuration**:
- URL: `https://your-heroku-app.herokuapp.com/api/run`
- Method: POST
- Schedule: Every 20 minutes (`*/20 * * * *`)
- Timeout: 60 seconds
- Notification: Email on failure

**Dyno Sleep Mitigation**:
- Cron-Job.org pings every 20 minutes → dyno never sleeps
- If cron fails, dyno sleeps but wakes on next request (30-second cold start, acceptable)
- Monitor uptime via Heroku metrics (free plan includes basic monitoring)

**Alternatives Considered**:
- **Railway**: Free tier ($5 credit/month, ~550 hours) similar to Heroku but less mature ecosystem. Rejected for Heroku's proven track record.
- **Fly.io**: Generous free tier (3 VMs, 160GB bandwidth) but requires Docker. Rejected for simplicity (Heroku buildpacks easier).
- **Self-hosted VPS**: Rejected due to setup complexity and ongoing maintenance (violates hackathon speed constraint).

**Best Practices**:
- Use environment variables for all secrets (never commit API keys)
- Enable Heroku log drains to Supabase for centralized logging (free tier allows 1500 log lines/min)
- Set up Vercel preview deployments for feature branches
- Use Supabase Edge Functions only if needed (currently not required for MVP)

**Free-Tier Limits**:
| Service | Free Tier Limit | MVP Usage | Headroom |
|---------|----------------|-----------|----------|
| Heroku | 550 hours/month | 720 hours/month (always-on) | ⚠️ **Exceeds** by 170 hours - need credit card verification for 1000 hours/month |
| Vercel | Unlimited bandwidth | ~10GB/month (1000 users × 10 visits × 1MB page) | ✅ Safe |
| Supabase | 500MB storage | 10MB/month | ✅ Safe (50x headroom) |
| Supabase | 2GB bandwidth | ~500MB/month (API reads) | ✅ Safe (4x headroom) |
| Cron-Job.org | 50 jobs | 1 job | ✅ Safe |
| TwitterAPI.io | 100 req/day | 72 posts/day | ⚠️ **Tight** - may need paid tier ($9/mo for 1000 req/day) |
| CoinGecko | 50 calls/min | ~1 call/20min (cached 5min) | ✅ Safe |

**Cost Projection**:
- Free tier: $0/month (if Heroku credit card verified, TwitterAPI.io within limits)
- Paid tier (production): TwitterAPI.io $9/mo = **$9/month total**

---

### 4. Agent Cookie Content Formatting

**Decision**: Study Agent Cookie's Twitter thread format and replicate styling, emoji usage, narrative voice, and data presentation structure in `GeneratorAgent`.

**Rationale**:
- Agent Cookie is the benchmark for addictive crypto intel content
- Users expect similar quality and format for Rogue to be "Agent Cookie killer"
- Formatting includes: opening hook, numbered insights, data callouts, KOL mentions, closing CTA

**Example Agent Cookie Format**:
```
🔥 NARRATIVE ALERT: [Token] is cooking something big

1/ [Hook about what's happening]
   - KOL @username just tweeted about it
   - Volume up 300% in 24h
   - Smart money wallets accumulating

2/ [Deep dive into the narrative]
   📊 Data: [specific metrics]
   💭 Sentiment: [community reaction]
   
3/ [Whale activity or technical analysis]
   🐋 Top wallet bought $XXXk
   📈 Chart showing breakout

4/ [The play / conclusion]
   ⏰ This is early
   🎯 Watch for [catalyst]
   
Not financial advice. DYOR. 👀
```

**Implementation in GeneratorAgent**:
```typescript
// backend/src/agents/generator.agent.ts
async function generateIntelThread(analysis: AnalysisResult): Promise<string> {
  const prompt = `
    Generate a crypto intel thread in Agent Cookie style:
    - Opening hook with fire emoji
    - 3-4 numbered insights with supporting data
    - Include relevant emojis (🔥📊💭🐋📈⏰🎯)
    - Mention specific KOLs and whale wallets from analysis
    - Close with "Not financial advice. DYOR. 👀"
    
    Analysis data: ${JSON.stringify(analysis)}
  `;
  
  const thread = await this.model.complete(prompt);
  return thread;
}
```

**Best Practices**:
- Store successful thread templates in Supabase for few-shot prompting
- A/B test different formatting styles and track engagement (future iteration)
- Character limit for X: 280 chars per tweet, thread max 25 tweets
- For Telegram: no character limit, use markdown formatting

---

### 5. Telegram Bot API Early Delivery Implementation

**Decision**: Use Telegram Bot API to create private channel, verify users via wallet connection, and deliver early content based on tier timestamps.

**Rationale**:
- Bot API is free and supports unlimited channel members
- Private channel ensures content is gated (only members see messages)
- Bot can send messages at tier-specific times (T-30min for Gold, T-15min for Silver, T for public)

**Implementation Pattern**:
```typescript
// backend/src/services/telegram.service.ts
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const PRIVATE_CHANNEL_ID = '@RogueAlphaPrivate'; // Created manually

async function deliverEarlyContent(content: string, tier: Tier) {
  const delays = {
    DIAMOND: 30 * 60 * 1000, // 30 minutes before public
    GOLD: 30 * 60 * 1000,
    SILVER: 15 * 60 * 1000,
    NONE: 0
  };
  
  const delay = delays[tier];
  
  // Schedule delivery
  setTimeout(async () => {
    await bot.sendMessage(PRIVATE_CHANNEL_ID, content, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });
  }, delay);
}

// Wallet verification flow
bot.onText(/\/verify (.+)/, async (msg, match) => {
  const walletAddress = match[1];
  const tier = await verifyWalletTier(walletAddress);
  
  // Store user-tier mapping in Supabase
  await supabase.from('users').upsert({
    telegram_user_id: msg.from.id,
    wallet_address: walletAddress,
    tier: tier,
    verified_at: new Date()
  });
  
  await bot.sendMessage(msg.chat.id, `✅ Verified! You are ${tier} tier.`);
});
```

**Alternatives Considered**:
- **Discord**: Rejected due to more complex bot permissions and role management
- **WhatsApp Business API**: Rejected due to approval process and business account requirements
- **Custom WebSocket**: Rejected due to infrastructure complexity (would require separate server)

**Best Practices**:
- Use Telegram Bot API webhook mode in production (polling only for local dev)
- Implement rate limiting (30 messages/second per Telegram limits)
- Handle bot blocking gracefully (users can block bot, don't fail delivery to others)
- Store delivery timestamps in Supabase for audit trail

---

## Research Summary

All technical unknowns resolved. Implementation ready to proceed to Phase 1 (Data Model & Contracts).

**Key Decisions**:
1. ✅ ADK-TS with 5 agents on gpt-5-nano-2025-08-07
2. ✅ Solana web3.js with Moralis fallback for wallet verification
3. ✅ Vercel + Heroku + Supabase + Cron-Job.org free-tier deployment
4. ✅ Agent Cookie formatting style for intel threads
5. ✅ Telegram Bot API for early delivery with tier-based delays

**No blocking issues.** All technologies proven and well-documented. Proceed to data model design.
