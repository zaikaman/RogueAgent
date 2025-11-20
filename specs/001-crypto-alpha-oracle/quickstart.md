# Quickstart: Rogue Crypto Alpha Oracle

**Purpose**: Local development setup and deployment instructions
**Created**: 2025-11-20
**Plan**: [plan.md](./plan.md)

## Prerequisites

- Node.js 20+ LTS
- npm or yarn
- Git
- Solana wallet (for testing tier verification)
- Supabase account (free tier)
- Heroku account (free tier with credit card verification)
- Vercel account (free tier)
- API keys: OpenAI, TwitterAPI.io, Telegram Bot, Moralis (optional)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/rogue-agent.git
cd rogue-agent
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment template
cp .env.example .env
```

**Edit `.env` with your credentials**:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# OpenAI (for ADK-TS agents)
OPENAI_API_KEY=sk-...

# Twitter
TWITTER_API_KEY=your-twitterapi-io-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_PRIVATE_CHANNEL_ID=@YourPrivateChannel

# Solana
RGE_MINT_ADDRESS=your-rge-token-mint
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Optional: Moralis (for production wallet verification)
MORALIS_API_KEY=your-moralis-key

# API Security
API_KEY=your-secret-api-key-for-cron
```

**Run database migrations**:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

**Start development server**:
```bash
npm run dev
# Server runs on http://localhost:3000
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Copy environment template
cp .env.example .env.local
```

**Edit `.env.local`**:
```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RGE_MINT_ADDRESS=your-rge-token-mint
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Start development server**:
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Test Local Setup

**Trigger a manual run**:
```bash
curl -X POST http://localhost:3000/api/run \
  -H "X-API-Key: your-secret-api-key-for-cron"
```

**Check run status**:
```bash
curl http://localhost:3000/api/run-status
```

**Visit frontend**:
```
http://localhost:5173
```

---

## Deployment

### Deploy Backend to Heroku

```bash
cd backend

# Login to Heroku
heroku login

# Create app
heroku create rogue-oracle

# Set environment variables
heroku config:set SUPABASE_URL=https://...
heroku config:set SUPABASE_SERVICE_KEY=...
heroku config:set OPENAI_API_KEY=...
heroku config:set TWITTER_API_KEY=...
heroku config:set TELEGRAM_BOT_TOKEN=...
heroku config:set TELEGRAM_PRIVATE_CHANNEL_ID=...
heroku config:set RGE_MINT_ADDRESS=...
heroku config:set SOLANA_RPC_URL=...
heroku config:set API_KEY=...

# Deploy
git push heroku main

# Verify deployment
heroku logs --tail
curl https://rogue-oracle.herokuapp.com/health
```

### Deploy Frontend to Vercel

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables via dashboard
# https://vercel.com/your-org/rogue-frontend/settings/environment-variables
```

**Or use Vercel GitHub integration** (recommended):
1. Push to GitHub
2. Import project in Vercel dashboard
3. Set environment variables
4. Auto-deploys on every push to `main`

### Setup Cron Job

1. Go to https://cron-job.org
2. Create free account
3. Add new cron job:
   - URL: `https://rogue-oracle.herokuapp.com/api/run`
   - Method: POST
   - Headers: `X-API-Key: your-secret-api-key-for-cron`
   - Schedule: `*/20 * * * *` (every 20 minutes)
   - Timeout: 60 seconds
4. Enable job

### Setup Telegram Bot

```bash
# Talk to @BotFather on Telegram
/newbot
# Follow prompts to create bot, save token

# Create private channel
# Add bot as admin to channel
# Get channel ID (use @RawDataBot in channel)
```

### Setup Twitter Account

1. Create `@RogueSignals` account
2. Get API access via TwitterAPI.io
3. Test posting:
```bash
curl -X POST http://localhost:3000/api/run
# Check @RogueSignals feed
```

---

## Testing

### Backend Tests

```bash
cd backend
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration  # API tests
```

### Frontend Tests

```bash
cd frontend
npm run test           # Vitest unit tests
npm run test:e2e       # Playwright E2E (optional)
```

### Manual Testing Scenarios

**Test Wallet Tier Verification**:
```bash
curl -X POST http://localhost:3000/api/tiers/verify \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "YOUR_SOLANA_WALLET",
    "telegram_user_id": 123456789
  }'
```

**Test Custom Request (Diamond Tier)**:
```bash
curl -X POST http://localhost:3000/api/custom-requests \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "DIAMOND_TIER_WALLET",
    "token_symbol": "BONK"
  }'
```

---

## Troubleshooting

### Heroku Dyno Sleeping
**Problem**: Backend not responding after 30 minutes of inactivity
**Solution**: Verify Cron-Job.org is pinging every 20 minutes. Check cron job logs.

### Supabase Connection Errors
**Problem**: `Error: Invalid Supabase credentials`
**Solution**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Heroku config vars. Use service role key, not anon key.

### Solana RPC Timeouts
**Problem**: Wallet verification taking >5 seconds
**Solution**: Switch to Moralis API or use Helius RPC (paid). Add retry logic in `solana.service.ts`.

### TwitterAPI.io Rate Limits
**Problem**: `429 Too Many Requests`
**Solution**: Upgrade to paid tier ($9/mo for 1000 req/day) or reduce posting frequency.

### Frontend Not Connecting to Backend
**Problem**: CORS errors in browser console
**Solution**: Add Vercel domain to CORS whitelist in `backend/src/server.ts`:
```typescript
app.use(cors({
  origin: ['https://your-frontend.vercel.app', 'http://localhost:5173']
}));
```

---

## Environment Variables Reference

### Backend (Heroku)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (not anon key) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for gpt-5-nano |
| `TWITTER_API_KEY` | Yes | TwitterAPI.io key |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token from @BotFather |
| `TELEGRAM_PRIVATE_CHANNEL_ID` | Yes | Private channel ID (e.g., @RogueAlphaPrivate) |
| `RGE_MINT_ADDRESS` | Yes | $RGE Solana token mint address |
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint |
| `API_KEY` | Yes | Secret key for cron job authentication |
| `MORALIS_API_KEY` | No | Optional: Moralis for production RPC |
| `NODE_ENV` | No | Set to `production` (auto-set by Heroku) |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend URL (Heroku app URL) |
| `VITE_SUPABASE_URL` | No | Only if direct Supabase access needed |
| `VITE_SUPABASE_ANON_KEY` | No | Only for read-only client queries |
| `VITE_RGE_MINT_ADDRESS` | Yes | For wallet tier display |
| `VITE_SOLANA_RPC_URL` | Yes | For Wallet Connect integration |

---

## Development Workflow

1. **Create feature branch**: `git checkout -b feature/new-agent`
2. **Make changes**: Edit files in `backend/src/` or `frontend/src/`
3. **Test locally**: `npm run dev` in both directories
4. **Run tests**: `npm run test`
5. **Commit**: `git commit -m "feat: add new scanner agent"`
6. **Push**: `git push origin feature/new-agent`
7. **Deploy**: Merge to `main` triggers auto-deploy on Vercel

**For backend**: Manual push to Heroku or setup GitHub Actions

---

## Monitoring & Logs

### Heroku Logs
```bash
heroku logs --tail --app rogue-oracle
heroku logs --source app --tail  # App logs only
```

### Supabase Logs
Dashboard → Logs → Query logs, API logs

### Vercel Logs
Dashboard → Deployments → Click deployment → Logs

### Cron-Job.org Logs
Dashboard → Jobs → Click job → Execution history

---

## Next Steps

- [ ] Complete all setup steps above
- [ ] Run first manual execution via `/api/run`
- [ ] Verify signal posts to Twitter
- [ ] Test tier verification with test wallet
- [ ] Setup monitoring alerts (optional)
- [ ] Ready for task implementation phase!

For implementation tasks, run `/speckit.tasks` to generate `tasks.md`.
