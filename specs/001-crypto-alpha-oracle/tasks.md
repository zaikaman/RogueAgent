---
description: "Implementation tasks for Rogue Crypto Alpha Oracle"
---

# Tasks: Rogue Crypto Alpha Oracle

**Input**: Design documents from `/specs/001-crypto-alpha-oracle/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- All paths shown below follow plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project root directories (backend/, frontend/, shared/)
- [ ] T002 [P] Initialize backend Node.js project with TypeScript in backend/package.json
- [ ] T003 [P] Initialize frontend React/Vite project with TypeScript in frontend/package.json
- [ ] T004 [P] Setup TypeScript config with strict mode in backend/tsconfig.json
- [ ] T005 [P] Setup TypeScript config for React in frontend/tsconfig.json
- [ ] T006 [P] Configure ESLint + Prettier for backend in backend/.eslintrc.json
- [ ] T007 [P] Configure ESLint + Prettier for frontend in frontend/.eslintrc.json
- [ ] T008 [P] Setup Tailwind CSS config in frontend/tailwind.config.js
- [ ] T009 [P] Install shadcn/ui CLI and initialize in frontend/components/ui/
- [ ] T010 Create environment template files (backend/.env.example, frontend/.env.example)
- [ ] T011 [P] Setup Supabase project and copy connection details to .env
- [ ] T012 Run Supabase migration from data-model.md in Supabase dashboard
- [ ] T013 [P] Create Procfile for Heroku deployment in backend/Procfile
- [ ] T014 [P] Create vercel.json for frontend deployment in frontend/vercel.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T015 [P] Create shared TypeScript types for Signal in shared/types/signal.types.ts
- [ ] T016 [P] Create shared TypeScript types for IntelThread in shared/types/intel.types.ts
- [ ] T017 [P] Create shared TypeScript types for User/Tier in shared/types/user.types.ts
- [ ] T018 [P] Setup Zod schemas for runtime validation in backend/src/types/validation.ts
- [ ] T019 Create Supabase service with connection pool in backend/src/services/supabase.service.ts
- [ ] T020 [P] Create retry utility with exponential backoff in backend/src/utils/retry.util.ts
- [ ] T021 [P] Create logger utility writing to Supabase in backend/src/utils/logger.util.ts
- [ ] T022 Create Express app setup with CORS and middleware in backend/src/server.ts
- [ ] T023 Create main entry point and port listener in backend/src/index.ts
- [ ] T024 [P] Create API routes file with Express router in backend/src/api/routes.ts
- [ ] T025 [P] Create environment config loader with validation in backend/src/config/env.config.ts
- [ ] T026 [P] Setup React Query provider in frontend/src/App.tsx
- [ ] T027 [P] Create Axios API service wrapper in frontend/src/services/api.service.ts
- [ ] T028 [P] Create error message constants in frontend/src/constants/messages.ts
- [ ] T029 [P] Create tier threshold constants in frontend/src/constants/tiers.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 4 - Ecosystem Scanning & Signal Generation (Priority: P1) 🎯 MVP CORE

**Goal**: Build the 5-agent ADK-TS swarm that scans crypto ecosystem every 20 minutes and generates signals/intel

**Independent Test**: Trigger manual run via POST /api/run, verify swarm executes and saves result to Supabase

### Implementation for User Story 4

- [ ] T030 [P] [US4] Install ADK-TS dependencies (@microsoft/adk) in backend/package.json
- [ ] T031 [P] [US4] Create Scanner Agent to collect CoinGecko/Twitter/Moralis data in backend/src/agents/scanner.agent.ts
- [ ] T032 [P] [US4] Create Analyzer Agent for pattern detection and confidence scoring in backend/src/agents/analyzer.agent.ts
- [ ] T033 [P] [US4] Create Generator Agent for signal/intel content generation in backend/src/agents/generator.agent.ts
- [ ] T034 [US4] Create Agent Orchestrator to run 5-agent swarm sequentially in backend/src/agents/orchestrator.ts
- [ ] T035 [US4] Implement POST /api/run controller to trigger swarm in backend/src/api/run.controller.ts
- [ ] T036 [US4] Add run execution logic: save to Supabase runs table in backend/src/services/supabase.service.ts
- [ ] T037 [P] [US4] Create CoinGecko API client service in backend/src/services/coingecko.service.ts
- [ ] T038 [P] [US4] Add 5-minute price caching to CoinGecko service
- [ ] T039 [US4] Implement duplicate signal prevention (7-day token cache) in Analyzer Agent
- [ ] T040 [US4] Add confidence scoring logic (1-10 scale) in Analyzer Agent
- [ ] T041 [US4] Implement Agent Cookie formatting style in Generator Agent
- [ ] T042 [US4] Add skip logic when no high-confidence signals found in Orchestrator

**Checkpoint**: At this point, User Story 4 should execute swarm and save results - fully functional core engine

---

## Phase 4: User Story 1 - Public Signal Consumption (Priority: P1) 🎯 MVP

**Goal**: Post generated signals/intel to public X/Twitter account @RogueSignals

**Independent Test**: Trigger run, verify signal posts to Twitter with all required fields

### Implementation for User Story 1

- [ ] T043 [P] [US1] Install TwitterAPI.io client dependencies in backend/package.json
- [ ] T044 [US1] Create Twitter service with TwitterAPI.io client in backend/src/services/twitter.service.ts
- [ ] T045 [US1] Create Publisher Agent for X/Telegram posting in backend/src/agents/publisher.agent.ts
- [ ] T046 [US1] Implement Twitter post logic with formatted signal in Publisher Agent
- [ ] T047 [US1] Add Twitter post retry logic (3 attempts, exponential backoff) in Publisher Agent
- [ ] T048 [US1] Update Orchestrator to call Publisher Agent after Generator in backend/src/agents/orchestrator.ts
- [ ] T049 [US1] Save public_posted_at timestamp to runs table after successful post
- [ ] T050 [US1] Implement GET /api/run-status to return latest run in backend/src/api/status.controller.ts
- [ ] T051 [US1] Implement GET /api/logs with pagination in backend/src/api/logs.controller.ts
- [ ] T052 [US1] Add error handling for Twitter rate limits (429 responses)

**Checkpoint**: Public signals now post to Twitter automatically - viral growth engine live

---

## Phase 5: User Story 2 - Token-Gated Early Access (Priority: P1) 🎯 MVP

**Goal**: Deliver signals to Telegram private channel 15-30 min early based on tier

**Independent Test**: Connect wallet, verify tier, receive signal in Telegram before Twitter post

### Implementation for User Story 2

- [ ] T053 [P] [US2] Install node-telegram-bot-api in backend/package.json
- [ ] T054 [US2] Create Telegram service with Bot API client in backend/src/services/telegram.service.ts
- [ ] T055 [US2] Install @solana/web3.js and @solana/spl-token in backend/package.json
- [ ] T056 [US2] Create Solana service for RPC wallet verification in backend/src/services/solana.service.ts
- [ ] T057 [US2] Implement wallet balance query via Solana RPC in Solana service
- [ ] T058 [US2] Add $RGE token USD conversion using cached CoinGecko price
- [ ] T059 [US2] Implement tier calculation (NONE/SILVER/GOLD/DIAMOND) based on USD value
- [ ] T060 [US2] Add 5-second timeout to Solana RPC calls with fallback to cached tier
- [ ] T061 [US2] Create Tier Manager Agent for wallet verification in backend/src/agents/tier-manager.agent.ts
- [ ] T062 [US2] Implement POST /api/tiers/verify endpoint in backend/src/api/tiers.controller.ts
- [ ] T063 [US2] Save verified users to Supabase users table with tier
- [ ] T064 [US2] Add Telegram bot /verify command handler for wallet connection
- [ ] T065 [US2] Implement tier-based early delivery in Publisher Agent (T-30min Gold, T-15min Silver)
- [ ] T066 [US2] Add Telegram message delivery with retry logic
- [ ] T067 [US2] Save telegram_delivered_at timestamp to runs table
- [ ] T068 [US2] Implement automatic tier downgrade on next verification if balance drops
- [ ] T069 [US2] Add Sunday deep-dive report generation for Gold/Diamond tiers
- [ ] T070 [US2] Implement Diamond tier custom request creation in backend/src/api/custom-requests.controller.ts
- [ ] T071 [US2] Add daily quota check (1 request per 24 hours) for Diamond tier
- [ ] T072 [US2] Create custom request processing logic in Analyzer Agent
- [ ] T073 [US2] Deliver custom analysis privately via Telegram DM

**Checkpoint**: Token-gated early access working - $RGE utility demonstrated, monetization live

---

## Phase 6: User Story 3 - Rogue Terminal Dashboard (Priority: P2)

**Goal**: Build dark-themed web interface with wallet connect, countdown, tier display, historical performance

**Independent Test**: Connect wallet, see tier update in <3 seconds, countdown shows time to next run

### Implementation for User Story 3

- [ ] T074 [P] [US3] Install @solana/wallet-adapter-react in frontend/package.json
- [ ] T075 [P] [US3] Install Recharts for data visualization in frontend/package.json
- [ ] T076 [P] [US3] Create WalletConnect component with Solana adapter in frontend/src/components/WalletConnect.tsx
- [ ] T077 [P] [US3] Create TierDisplay component showing badge and benefits in frontend/src/components/TierDisplay.tsx
- [ ] T078 [P] [US3] Create Countdown component with 20-minute cycle timer in frontend/src/components/Countdown.tsx
- [ ] T079 [P] [US3] Create SignalCard component for latest public signal in frontend/src/components/SignalCard.tsx
- [ ] T080 [P] [US3] Create IntelThread component with Agent Cookie formatting in frontend/src/components/IntelThread.tsx
- [ ] T081 [P] [US3] Create TerminalLog component for run history feed in frontend/src/components/TerminalLog.tsx
- [ ] T082 [P] [US3] Create MindshareChart component with Recharts in frontend/src/components/MindshareChart.tsx
- [ ] T083 [P] [US3] Create GatedContent wrapper component for tier-locked sections in frontend/src/components/GatedContent.tsx
- [ ] T084 [US3] Create Terminal main page component in frontend/src/pages/Terminal.tsx
- [ ] T085 [US3] Create useRunStatus hook polling /api/run-status in frontend/src/hooks/useRunStatus.ts
- [ ] T086 [US3] Create useLogs hook fetching /api/logs in frontend/src/hooks/useLogs.ts
- [ ] T087 [US3] Create wallet service for tier verification in frontend/src/services/wallet.service.ts
- [ ] T088 [US3] Implement wallet connection flow calling POST /api/tiers/verify
- [ ] T089 [US3] Add tier status update on wallet connect (3-second requirement)
- [ ] T090 [US3] Implement countdown calculation from last run timestamp
- [ ] T091 [US3] Add real-time signal display when countdown reaches zero
- [ ] T092 [US3] Create historical performance view with win rate stats
- [ ] T093 [US3] Add mindshare trend visualizations from run data
- [ ] T094 [US3] Implement dark theme with Tailwind CSS in frontend/src/index.css
- [ ] T095 [US3] Add loading skeletons for all async components

**Checkpoint**: Rogue Terminal fully functional - transparent proof of value, retention driver

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, testing, deployment configuration

- [ ] T096 [P] Add health check endpoint GET /health in backend/src/api/health.controller.ts
- [ ] T097 [P] Setup Cron-Job.org account and configure 20-minute ping
- [ ] T098 [P] Create Jest test setup for backend in backend/jest.config.js
- [ ] T099 [P] Create Vitest config for frontend in frontend/vitest.config.ts
- [ ] T100 [P] Write unit tests for Solana service wallet verification
- [ ] T101 [P] Write unit tests for tier calculation logic
- [ ] T102 [P] Write integration test for POST /api/run endpoint
- [ ] T103 [P] Write integration test for GET /api/run-status endpoint
- [ ] T104 [P] Add API request logging to all Express routes
- [ ] T105 [P] Implement global error handler middleware in backend/src/server.ts
- [ ] T106 [P] Add CORS whitelist for Vercel frontend domain
- [ ] T107 [P] Create deployment documentation in README.md
- [ ] T108 [P] Add environment variable validation on backend startup
- [ ] T109 [P] Implement graceful shutdown handler for Heroku dyno restarts
- [ ] T110 [P] Add meta tags for social sharing in frontend/index.html

---

## Dependencies & Execution Order

### Story Completion Order

```
Phase 1 (Setup) → Phase 2 (Foundation)
  ↓
Phase 3 (US4 - Scanning) ← MUST complete first
  ↓
Phase 4 (US1 - Public Posts) ← depends on US4
  ↓
Phase 5 (US2 - Early Access) ← depends on US4, can run parallel with US1
  ↓
Phase 6 (US3 - Dashboard) ← depends on US1/US2 for data
  ↓
Phase 7 (Polish) ← final cleanup
```

### Critical Path (MVP)

**Minimum viable product requires**:
1. Phase 1 + 2 (Setup + Foundation) - 29 tasks
2. User Story 4 (Scanning) - 13 tasks
3. User Story 1 (Public Posts) - 10 tasks
4. User Story 2 (Early Access) - 21 tasks

**Total MVP**: 73 tasks
**Optional**: User Story 3 (Dashboard) - 22 tasks
**Polish**: 15 tasks

**Full Feature**: 110 tasks

### Parallel Execution Strategy

**Setup Phase (T001-T014)**: All tasks T002-T014 can run in parallel after T001

**Foundation Phase (T015-T029)**: Most tasks parallelizable:
- Group A (Types): T015-T018 parallel
- Group B (Services): T019-T021 parallel
- Group C (Backend Setup): T022-T025 parallel
- Group D (Frontend Setup): T026-T029 parallel

**User Story Phases**: 
- US4 tasks must complete sequentially (agent dependencies)
- US1 can start after US4 T034 (Orchestrator ready)
- US2 can start parallel with US1 (both need US4 complete)
- US3 can start after US1/US2 have first runs

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundation done:
   - Developer A: User Story 4 (Core Swarm) - sequential work
   - Developer B: User Story 2 (Tier System) - can prep Solana/Telegram services
   - Developer C: User Story 3 (Frontend) - can build UI components
3. After US4 complete:
   - Developer A: User Story 1 (Twitter Integration)
   - Developer B: Finish US2 (integrate with swarm)
   - Developer C: Finish US3 (integrate with API)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

**Estimated Timeline**:
- Setup + Foundation: 4-6 hours
- User Story 4: 6-8 hours
- User Story 1: 3-4 hours
- User Story 2: 6-8 hours
- User Story 3: 6-8 hours
- Polish: 2-3 hours

**Total: 27-37 hours** (3-5 days for single developer, 1-2 days for team of 3)
