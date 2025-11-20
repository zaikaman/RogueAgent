# Rogue Agent

Rogue Agent is a crypto alpha oracle with a scanning swarm, Twitter/Telegram publishing, and a token-gated intelligence dashboard on Fraxtal.

## Architecture

- **Backend**: Node.js, Express, TypeScript, Supabase
- **Frontend**: React, Vite, Tailwind, Shadcn UI, Wagmi
- **Blockchain**: Fraxtal Network (Token Gating)

## Prerequisites

- Node.js v18+
- Supabase Project
- Telegram Bot Token
- Twitter API Credentials (optional)
- Fraxtal RPC URL

## Environment Variables

Copy `.env.example` to `.env` in both `backend` and `frontend` directories and fill in the required values.

### Backend (.env)

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
RPC_URL=https://rpc.frax.com
RGE_TOKEN_ADDRESS=0x...
MIN_RGE_REQUIRED=1000
ALLOWED_ORIGINS=http://localhost:5173,https://rogue-agent.xyz
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
VITE_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
```

## Local Development

1. **Install Dependencies**

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

2. **Start Backend**

```bash
cd backend
npm run dev
```

3. **Start Frontend**

```bash
cd frontend
npm run dev
```

## Deployment

### Backend

1. Build the project:
```bash
cd backend
npm run build
```

2. Start the server:
```bash
npm start
```

Ensure environment variables are set in your production environment (e.g., Railway, Render, AWS).

### Cron Job Setup

To ensure the swarm runs every 20 minutes, set up an external cron job (e.g., using Cron-Job.org or GitHub Actions) to ping the run endpoint:

- **URL**: `https://your-api-url.com/api/run`
- **Method**: `POST`
- **Schedule**: Every 20 minutes

### Frontend

1. Build the project:
```bash
cd frontend
npm run build
```

2. Serve the `dist` folder using a static file server or deploy to Vercel/Netlify.

## License

MIT
