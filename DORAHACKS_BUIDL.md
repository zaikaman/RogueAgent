# ROGUE | Autonomous Crypto Trading Oracle

![Rogue Agent Banner](https://rogue-adk.vercel.app/logo.webp)

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-rogue--adk.vercel.app-00ff9d?style=for-the-badge&logo=vercel)](https://rogue-adk.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)

**Autonomous Multi-Agent Swarm for Crypto Market Intelligence & Trading**

</div>

---

## 🪙 Token Information

| Property | Value |
|----------|-------|
| **Token Name** | $RGE (Rogue Token) |
| **Contract Address** | `0xe5Ee677388a6393d135bEd00213E150b1F64b032` |
| **Chain** | Fraxtal |
| **Purchase** | [app.iqai.com/pending/0xe5Ee677388a6393d135bEd00213E150b1F64b032](https://app.iqai.com/pending/0xe5Ee677388a6393d135bEd00213E150b1F64b032) |

---

## ⚡ What is Rogue?

**Rogue** is an **autonomous Crypto Trading Oracle**—a sophisticated multi-agent swarm that goes beyond analysis to actually execute trades. Built on **IQ.AI ADK-TS**, it operates 24/7, scanning global markets, analyzing on-chain data, and executing trades autonomously on Hyperliquid.

### Core Capabilities

- **30+ data sources**: CoinGecko, Birdeye, DeFi Llama, CoinMarketCap, **Binance Futures**
- **122 unified tradeable tokens** verified on both Binance Futures AND Hyperliquid
- **Real-time social sentiment** from X (Twitter) and crypto news
- **On-chain analytics**: volume spikes, whale movements, TVL shifts
- **Advanced Technical Analysis**: CVD, ICT Order Blocks, Volume Profile, SuperTrend, BB Squeeze, VW-MACD, Fibonacci, MTF alignment
- **Professional Chart Generation**: TradingView-quality PNG charts with candlesticks, MAs, BBands
- **Vision-based Chart Analysis**: LLM analyzes actual chart images for pattern recognition
- **Autonomous futures trading** on Hyperliquid (LONG/SHORT positions)

### What Makes Rogue Different?

🎯 **Autonomous Operation**: Runs 24/7 without manual input  
🧠 **Multi-Agent Intelligence**: 10+ specialized agents for scanning, analysis, execution, and distribution  
📈 **From Analysis to Execution**: Trades LONG/SHORT positions on Hyperliquid with dynamic leverage  
⚠️ **Strict Risk Management**: Minimum **3% SL**, **1:2.5 R:R** requirement, **85%+ confidence**, structural stop placement  
🔄 **Bias-First Scanning**: Determines LONG/SHORT/NEUTRAL market bias before finding matching opportunities  
📊 **Visual Chart Analysis**: TradingView chart images for pattern confirmation  
🗣️ **Voice AI Interface**: Speak to Rogue using natural language via VAPI  

---

## 🧠 The Swarm Architecture

Rogue operates as a coordinated **Swarm of Agents** where the **Orchestrator** manages all specialized agents:

**Signal Generation Flow**: Orchestrator → Scanner Agent → Analyzer Agent → Writer Agent → Publisher Agent → Tiered Distribution (Diamond/Gold/Silver/Public)

**Futures Trading Flow**: Orchestrator → Futures Scanner → Futures Analyzer → Signal Executor → Hyperliquid

**Supporting Agents**: Intel Agent, Yield Agent, Airdrop Agent, Chat Agent, Predictor Agent

### Agent Breakdown

| Agent | Role |
|-------|------|
| **🎯 Orchestrator** | Schedules swarm runs, routes data, enforces signal quotas, validates quality gates |
| **👁️ Scanner** | **Bias-First methodology** — determines LONG/SHORT/NEUTRAL market direction, then finds matching tokens (max 3 candidates) |
| **🧠 Analyzer** | Deep technical analysis with 2025 meta indicators, visual chart analysis, **85%+ confidence requirement** |
| **📊 Intel** | Identifies emerging narratives and macro trends |
| **🌾 Yield** | Discovers high-APY farming opportunities |
| **🎁 Airdrop** | Finds new airdrop opportunities within 72h of launch |
| **🎲 Predictor** | Discovers high-edge Polymarket bets (Diamond exclusive) |
| **📈 Futures Scanner/Analyzer** | LONG/SHORT signal generation for perpetuals |
| **✍️ Writer** | Formats signals into actionable content |
| **📡 Publisher** | Multi-channel tiered distribution |
| **💬 Chat** | Conversational AI with real-time X search |

---

## 🛠️ How We Used ADK-TS

Rogue is built on the **IQ.AI Agent Development Kit (ADK-TS)**, a TypeScript framework for building sophisticated AI agents.

### 🏗️ AgentBuilder Pattern

Every agent is created using ADK's fluent **AgentBuilder** API. We use methods like `.withModel()` to attach different LLMs per agent (GPT-5-Nano for analysis, Grok for web search), `.withInstruction()` for detailed system prompts with trading rules, `.withTools()` to attach callable functions for price lookups, TA calculations, and social posting, and `.withOutputSchema()` to enforce structured JSON outputs with Zod schemas.

### 🔧 Tool System

ADK's **createTool** function allows agents to interact with external APIs. Rogue defines **25+ custom tools** across categories:

- **Market Data**: Token prices, market charts, trending coins
- **Technical Analysis**: Advanced TA indicators, CoinGecko ID lookups
- **Fundamentals**: Market cap analysis, yield pool discovery
- **Sentiment**: News and X/Twitter sentiment via Tavily
- **Database**: Recent signals and intel queries
- **Publishing**: Tweet posting, Telegram messaging

### 🔄 Multi-Provider LLM Support

ADK provides **AiSdkLlm** to wrap any AI SDK-compatible model. We use GPT for complex analysis tasks and Grok for real-time web/X search capabilities, allowing each agent to use the optimal model for its specific task.

### 📋 Structured Outputs with Zod

Every agent returns type-safe, validated JSON using Zod schemas. This ensures signal details (direction, entry price, target, stop loss, confidence) are always properly structured and validated at runtime.

### 🏃 Agent Runner & Orchestration

The Orchestrator calls each agent sequentially via the `.runner` interface. The flow goes: Scanner finds candidates → Analyzer performs deep analysis → Writer formats content → Publisher distributes to tiers. Each agent is equipped with only the tools it needs for its specific task.

### 📊 ADK-TS Features Summary

| ADK Feature | Rogue Implementation |
|-------------|---------------------|
| AgentBuilder | 10+ specialized agents with fluent configuration |
| createTool | 25+ custom tools for market data, TA, publishing |
| AiSdkLlm | Multi-provider setup (OpenAI, X.AI/Grok) |
| Zod integration | Type-safe structured outputs for all agents |
| Agent runner | Sequential orchestration in swarm pipeline |

**Why ADK-TS?**
- 🚀 **Rapid Development**: Builder pattern enables quick agent prototyping
- 🔒 **Type Safety**: Full TypeScript support with Zod validation
- 🔧 **Extensible Tools**: Easy integration with any API or service
- 🤖 **Model Agnostic**: Swap LLMs without changing agent logic
- 📦 **Production Ready**: Built for real-world agent deployments

---

## 📈 Futures Trading on Hyperliquid

**Autonomous perpetual futures trading** with support for Mainnet (real funds) and Testnet (paper trading).

| Feature | Details |
|---------|---------|
| **Network** | Mainnet or Testnet - switchable in UI |
| **Authentication** | EIP-712 typed data signing |
| **Directions** | LONG and SHORT positions |
| **Max Leverage** | Dynamic per asset (BTC: 50x, memecoins: 3-5x) |
| **Order Types** | Market, Limit, Trigger (stop-loss/take-profit) |

**Architecture**: Futures Scanner Agent (finds LONG/SHORT opportunities) → Futures Analyzer Agent (calculates entry/SL/TP) → Signal Executor (executes orders) → Hyperliquid

---

## 🎯 Advanced Technical Analysis (2025 Meta)

Rogue uses **8 advanced indicators** achieving **89-97% accuracy**:

1. **CVD (Cumulative Volume Delta)** - Orderflow analysis, whale accumulation
2. **ICT Order Blocks & FVG** - Institutional zones, smart money levels
3. **Volume Profile (VPFR)** - POC and Value Area for S/R
4. **Heikin-Ashi + SuperTrend** - Noise filtering, 65% fewer whipsaws
5. **Multi-Timeframe Alignment** - Confluence scoring, 97% win rate when aligned
6. **BB Squeeze + Keltner Breakout** - Volatility expansion detection
7. **Volume-Weighted MACD** - Enhanced for low-liquidity chains
8. **Fibonacci Levels** - Precision entry/exit zones

**Signal Quality Gate (Updated)**:

| Metric | Minimum | Preferred |
|--------|---------|----------|
| Confidence Score | **85%** | 90%+ |
| Risk/Reward Ratio | **1:2** | 1:2.5+ |
| MTF Alignment | **50%** | 70%+ |
| Confluences | **2+** | 5+ |
| Stop-Loss Distance | **3%** | 3-8% |

**Signal Tiers**:

| Score | Quality | Requirements |
|-------|---------|---------------|
| 92-100 | 🔥 TIER 1 | 5+ confluences, 1:2.5+ R:R |
| 85-91 | ✅ TIER 2 | 2+ confluences, 1:2+ R:R, 50%+ MTF |
| < 85 | ❌ REJECTED | Below quality gate |

---

## 🚀 Key Features

### Live Alpha Dashboard
- Real-time signal feed with confidence indicators
- Intel feed with market narrative analysis
- Yield farming hub (10-30 curated opportunities)
- Airdrop tracker with Rogue Score
- Analytics dashboard with performance metrics

### Voice Interaction (VAPI)
- Natural language interface
- Real-time X search via Grok
- Custom tool calling for DB queries and price lookups

### "Ask Rogue" Terminal
- Web3 wallet connection for personalized responses
- Tier-aware intel distribution
- Streaming responses with conversation history

### Tiered Access System

| Tier | Requirement | Benefits |
|------|-------------|----------|
| 💎 Diamond | 1000+ RGE | Immediate signals, priority support, exclusive alpha |
| 🥇 Gold | 100-999 RGE | Immediate signals, advanced analytics |
| 🥈 Silver | 10-99 RGE | +15min delay signals |
| 🌐 Public | 0-9 RGE | +30min delay via X |

---

## 🆕 Recent Improvements

### Bias-First Scanner Methodology
The Scanner Agent now determines market bias **before** searching for tokens:
1. Analyze BTC context (4H trend, key levels)
2. Check funding rates (crowded positioning)
3. Sentiment scan (X/Twitter mood, news catalysts)
4. Commit to LONG/SHORT/NEUTRAL bias
5. Only find tokens aligned with that direction

### Enhanced Quality Gate
Stricter thresholds for higher win rates:
- Confidence: 80% → **85%**
- R:R: 1:2 → **1:2.5**
- MTF Alignment: **50% minimum**
- Confluences: **2+ minimum**
- Stop-Loss: 4% → **3%**

### Unified Tradeable Tokens (NEW)
**122 tokens** verified on BOTH Binance Futures AND Hyperliquid:
- Guaranteed chart data availability (Binance) + trade execution (Hyperliquid)
- Categories: Major, Layer 2, DeFi, Gaming, AI, Meme, Ecosystem
- Single source of truth eliminates duplicate token lists

### Binance Futures OHLCV Data (UPGRADED)
Institutional-grade candlestick data from Binance USDT-M Perpetual Futures:
- **122 cross-verified trading pairs**
- Accurate high/low/close/volume data
- 1500 candle history for deep analysis

### Vision-Based Chart Analysis (NEW)
AI-powered visual chart analysis using a two-stage pipeline:

**Stage 1: Chart Generation** — TradingView-quality candlestick charts (1800x1000 PNG) with SMA 20/50, Bollinger Bands, volume bars, OHLC info

**Stage 2: Vision LLM Analysis** — Charts sent to vision-capable LLM, returns detailed textual analysis of trends, patterns, and levels

**Flow**: Scanner → 3 candidates → Generate charts → Vision LLM analyzes images → Text analysis passed to Analyzer Agent

---

## 🛠️ Tech Stack

**Backend**: Node.js, TypeScript, Express, IQ.AI ADK-TS  
**AI**: GPT-5-Nano, Grok (X.AI), Zod schemas  
**Data**: CoinGecko, Birdeye, DeFi Llama, CoinMarketCap, Tavily  
**Trading**: Hyperliquid (Mainnet/Testnet)  
**Database**: Supabase (PostgreSQL)  
**Frontend**: React 18, Vite, Tailwind CSS, Radix UI  
**Web3**: Wagmi, Viem, RainbowKit  
**Voice**: VAPI  
**Deployment**: Vercel (Frontend), Heroku (Backend)

---

## 🔗 Links

- **Live Demo**: [rogue-adk.vercel.app](https://rogue-adk.vercel.app)
- **Token Contract**: `0xe5Ee677388a6393d135bEd00213E150b1F64b032` (Fraxtal)
- **Buy RGE**: [app.iqai.com](https://app.iqai.com/pending/0xe5Ee677388a6393d135bEd00213E150b1F64b032)

---

## 📋 Summary

Rogue is a production-ready autonomous trading system built on IQ.AI ADK-TS, featuring:

✅ Multi-agent swarm architecture (10+ specialized agents)  
✅ **Bias-First Scanner** — determines market direction before finding trades  
✅ **Enhanced Quality Gate** — 85%+ confidence, 1:2.5+ R:R, 2+ confluences  
✅ **122 Unified Tradeable Tokens** — verified on both Binance Futures & Hyperliquid  
✅ **Binance Futures OHLCV** — Institutional-grade candlestick data  
✅ **Professional Chart Generation** — TradingView-quality PNG charts with MAs, BBands, Volume  
✅ **Vision-based Chart Analysis** — LLM analyzes actual chart images  
✅ 25+ custom tools for market data, TA, and publishing  
✅ Advanced 2025 meta indicators (89-97% accuracy)  
✅ Autonomous futures trading on Hyperliquid  
✅ Real-time X search and sentiment analysis  
✅ Voice AI interface with natural language commands  
✅ Tiered access system with $RGE token  
✅ Professional React dashboard with live updates  

**Built for traders who demand institutional-grade intelligence, delivered autonomously.**
