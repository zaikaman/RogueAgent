# Implementation Plan: Rogue Crypto Alpha Oracle

**Branch**: `001-crypto-alpha-oracle` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-crypto-alpha-oracle/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Rogue is a real-time crypto alpha oracle that scans the ecosystem every 20 minutes to surface trading signals and intel threads. The system delivers content to public X/Twitter immediately while providing 15-30 minute early access to $RGE token holders via private Telegram based on three tiers (Silver/Gold/Diamond). A dark-themed web terminal displays live countdowns, historical performance, and tier status with wallet connection.

**Technical Approach**: Split-architecture full-stack TypeScript application with React 19 frontend (Vercel), Node.js + Express backend with ADK-TS 5-agent swarm (Heroku), and Supabase PostgreSQL for persistence. Zero-cost deployment optimized for hackathon speed: <900 lines total, free-tier hosting, 20-minute cron-triggered execution cycle.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20 LTS (backend), React 19 (frontend)  
**Primary Dependencies**: Frontend: Vite 5, Tailwind CSS 3.4, shadcn/ui, Recharts, React Query, Wallet Connect v2 (Solana adapter) | Backend: Express 4.18, ADK-TS (5-agent swarm on gpt-5-nano-2025-08-07), Supabase client, Telegram Bot API, TwitterAPI.io, Moralis Solana API, CoinGecko API  
**Storage**: Supabase PostgreSQL (managed cloud, free tier: 500MB, 2GB bandwidth/month) for run history, signals, intel threads, users, custom requests. Edge Functions available but not required for MVP.  
**Testing**: Vitest (frontend unit tests), Jest + Supertest (backend API tests), Playwright (E2E - optional for hackathon)  
**Target Platform**: Web browsers (Chrome 90+, Safari 15+) for frontend; Heroku free dyno (Linux) for backend; Vercel Edge Network for CDN  
**Project Type**: Web application (frontend + backend split architecture)  
**Performance Goals**: 20-minute scan cycle completion within ±30 seconds (99% SLA), 5-second wallet verification, 2-second frontend dashboard load, sub-100ms API response times (cached reads)  
**Constraints**: Free-tier hosting only (Heroku dyno sleeps after 30min inactivity, kept awake by Cron-Job.org), <900 lines total codebase, TwitterAPI.io rate limits (100 req/day free tier), Solana RPC public endpoints (may have rate limits), Telegram Bot API limits (30 msg/sec)  
**Scale/Scope**: MVP targets 100-1000 early users, 72 runs/day (20-min cycles), ~2000 signals/month, 3 tier levels, 1 custom request/user/day (Diamond only). Database growth: ~5KB per run = 360KB/day = 10MB/month well within Supabase free tier.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Excellence

✅ **PASS** - TypeScript enforces type safety across entire stack. No `any` types except for external API responses (documented). All functions will have explicit return types and parameter annotations. ADK-TS agent swarm follows modular single-responsibility pattern (5 separate agents: Scanner, Analyzer, Signal Generator, Publisher, Tier Manager). Error handling required for all external API calls (X, Telegram, Solana RPC, CoinGecko) with retry logic and logging to Supabase. JSDoc comments mandatory for all public functions and API endpoints.

**Implementation Notes**: Use ESLint + TypeScript strict mode. Shared `/types` directory for frontend/backend type definitions. Zod for runtime validation on API boundaries.

### II. User Experience Consistency

✅ **PASS** - Rogue Terminal provides consistent dark aesthetic and terminology throughout. All public signals follow identical formatting (token, entry, target, stop-loss, confidence, trigger event). Error messages on frontend include actionable guidance ("Connect wallet to view tier status" vs "Wallet not connected"). Countdown timer and tier display provide continuous workflow awareness. Terminology: "Signal" for trades, "Intel Thread" for narratives, "Tier" (Silver/Gold/Diamond) for access levels - used consistently across UI, API, and database.

**Implementation Notes**: shadcn/ui components ensure visual consistency. Centralized error message constants in `/constants/messages.ts`. Loading states and skeletons for all async operations.

### III. Performance & Reliability

⚠️ **CONDITIONAL PASS** - 20-minute cycle meets SC-001 (±30 sec variance). 5-second wallet verification achievable with direct Solana RPC calls (SC-002). Frontend 2-second load meets SC-009 with Vite optimization and Vercel Edge CDN. API response times <100ms for cached reads.

**Constraints Requiring Mitigation**:
- **Heroku dyno sleep**: Mitigated by Cron-Job.org pinging every 20 minutes (keeps dyno awake)
- **Free-tier API limits**: CoinGecko (50 calls/min), TwitterAPI.io (100/day), Solana RPC (public endpoints, rate limit unknown) - must implement request caching and graceful degradation
- **99.5% uptime (SC-006)**: Challenging with free Heroku (30-day rolling restarts, occasional platform issues). Acceptable for hackathon MVP but requires monitoring and fallback notifications.

**Mitigation Plan**: Implement retry logic with exponential backoff (FR-012). Cache CoinGecko prices for 5 minutes. Queue Telegram/X posts if APIs temporarily unavailable. Log all failures to Supabase for monitoring.

### Constitution Compliance Summary

**Status**: ✅ **APPROVED FOR PHASE 0** with performance monitoring requirements

**No violations requiring justification.** All principles satisfied within hackathon constraints. Free-tier limitations acknowledged and mitigated through caching, retry logic, and external cron service.

## Project Structure

### Documentation (this feature)

```text
specs/001-crypto-alpha-oracle/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: ADK-TS patterns, Solana RPC, free-tier deployment
├── data-model.md        # Phase 1 output: Supabase schema for runs, users, requests
├── quickstart.md        # Phase 1 output: Local dev + Vercel/Heroku deployment
├── contracts/           # Phase 1 output: OpenAPI spec for REST endpoints
│   └── api.openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── agents/              # ADK-TS 5-agent swarm
│   │   ├── scanner.agent.ts      # Social media + blockchain data collection
│   │   ├── analyzer.agent.ts     # Pattern detection, confidence scoring
│   │   ├── generator.agent.ts    # Signal/thread content generation
│   │   ├── publisher.agent.ts    # X/Twitter + Telegram posting
│   │   └── tier-manager.agent.ts # Wallet verification, tier enforcement
│   ├── api/                 # Express REST endpoints
│   │   ├── routes.ts            # Route definitions
│   │   ├── run.controller.ts    # POST /api/run - trigger swarm
│   │   ├── status.controller.ts # GET /api/run-status - latest run info
│   │   └── logs.controller.ts   # GET /api/logs - historical runs
│   ├── services/            # Business logic layer
│   │   ├── supabase.service.ts  # Database operations
│   │   ├── solana.service.ts    # RPC wallet verification
│   │   ├── twitter.service.ts   # TwitterAPI.io client
│   │   └── telegram.service.ts  # Bot API client
│   ├── types/               # Shared TypeScript types
│   │   ├── signal.types.ts
│   │   ├── intel.types.ts
│   │   └── user.types.ts
│   ├── utils/               # Helper functions
│   │   ├── retry.util.ts        # Exponential backoff
│   │   └── logger.util.ts       # Supabase logging
│   ├── config/              # Environment configuration
│   │   └── env.config.ts
│   ├── server.ts            # Express app setup
│   └── index.ts             # Entry point
├── tests/
│   ├── integration/         # API endpoint tests
│   └── unit/                # Service/utility tests
├── package.json
├── tsconfig.json
└── Procfile                 # Heroku deployment config

frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── WalletConnect.tsx    # Solana wallet integration
│   │   ├── TierDisplay.tsx      # User tier status badge
│   │   ├── Countdown.tsx        # Next run countdown timer
│   │   ├── SignalCard.tsx       # Latest public signal display
│   │   ├── IntelThread.tsx      # Intel thread display (Agent Cookie format)
│   │   ├── TerminalLog.tsx      # Run history feed
│   │   ├── MindshareChart.tsx   # Recharts visualizations
│   │   └── GatedContent.tsx     # Tier-locked sections
│   ├── pages/               # SPA routes (if using React Router, else single App.tsx)
│   │   └── Terminal.tsx         # Main Rogue Terminal page
│   ├── services/            # API client layer
│   │   ├── api.service.ts       # Axios/fetch wrapper for backend
│   │   └── wallet.service.ts    # Wallet Connect v2 logic
│   ├── hooks/               # React Query hooks
│   │   ├── useRunStatus.ts      # Poll /api/run-status
│   │   └── useLogs.ts           # Fetch /api/logs
│   ├── types/               # Shared types (symlink from backend or duplicated)
│   ├── constants/           # UI constants
│   │   ├── messages.ts          # Error/success messages
│   │   └── tiers.ts             # Tier thresholds ($50/$500/$5000)
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Vite entry point
│   └── index.css            # Tailwind imports
├── public/                  # Static assets
├── tests/
│   └── e2e/                 # Playwright tests (optional)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json              # Vercel deployment config

shared/                      # Optional: shared types if avoiding duplication
└── types/
    ├── signal.types.ts
    ├── intel.types.ts
    └── user.types.ts
```

**Structure Decision**: **Web application architecture** (Option 2 from template) selected due to frontend + backend split. Frontend deployed to Vercel Edge Network for global CDN and instant deploys. Backend deployed to Heroku free dyno for Node.js runtime and ADK-TS agent execution. Separation enables independent scaling and deployment workflows.

**Key Architectural Decisions**:
- **No monorepo tooling** (nx/turborepo) to stay under 900-line constraint - simple dual-package structure
- **Shared types** via npm workspace or direct import if co-located (to be determined in research phase)
- **No middleware layers** beyond Express built-ins - direct service calls from controllers
- **Supabase client** used in backend only; frontend never directly queries database (security)
- **All state management** via React Query - no Redux/Zustand needed for this scope

## Complexity Tracking

**No violations** - Constitution Check passed without requiring complexity justification. Free-tier constraints (Heroku dyno sleep, API rate limits) mitigated through architectural patterns (cron keep-alive, caching, retry logic) rather than introducing complexity.
