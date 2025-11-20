# Feature Specification: Rogue Crypto Alpha Oracle

**Feature Branch**: `001-crypto-alpha-oracle`  
**Created**: 2025-11-20  
**Status**: Draft  
**Input**: User description: "Build Rogue: a real-time crypto alpha oracle that lives on X and Telegram, relentlessly scanning the entire crypto ecosystem to surface explosive low-cap opportunities and narrative shifts before they hit mainstream CT..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public Signal Consumption (Priority: P1)

Anyone can follow @RogueSignals on X to receive real-time crypto trading signals and intel threads every 20 minutes, providing baseline market intelligence accessible to all users without any token requirements.

**Why this priority**: This is the core value proposition and viral growth engine. Public signals prove Rogue's accuracy while creating FOMO for early access. Without this, there's no product-market fit or acquisition funnel.

**Independent Test**: Can be fully tested by setting up a Twitter account, publishing a test signal with all required fields (token, entry, target, stop-loss, confidence, trigger event), and verifying it appears on the public feed within the 20-minute cycle.

**Acceptance Scenarios**:

1. **Given** the 20-minute cycle completes, **When** Rogue identifies a high-conviction trading opportunity, **Then** a formatted signal is posted to @RogueSignals containing token symbol, entry price, target price, stop-loss, confidence level (1-10), and the triggering event (KOL mention/whale move/drama).

2. **Given** the 20-minute cycle completes, **When** Rogue detects narrative shifts but no specific trade setup, **Then** an intel thread is posted breaking down mindshare surges, sentiment divergences, or KOL-driven narratives with data-backed insights.

3. **Given** a public signal has been posted, **When** users view the @RogueSignals feed, **Then** they see a chronological history of all past signals with timestamps, allowing performance verification.

---

### User Story 2 - Token-Gated Early Access (Priority: P1)

$RGE token holders receive the exact same signals 15-30 minutes earlier via private Telegram, with access tier determined by real-time on-chain wallet verification, creating immediate trading advantage and strong token utility.

**Why this priority**: This is the monetization mechanism and core differentiator. Early access creates measurable value that justifies holding $RGE. Without this, the token has no utility and the business model fails.

**Independent Test**: Can be tested by connecting a wallet with $500 worth of $RGE, joining the private Telegram channel, receiving a signal at time T, then verifying the same signal posts to public Twitter at time T+30 minutes.

**Acceptance Scenarios**:

1. **Given** a user holds $50-$499 worth of $RGE, **When** they connect their wallet to the Telegram bot, **Then** they gain Silver tier access and receive signals 15 minutes before public posting.

2. **Given** a user holds $500-$4,999 worth of $RGE, **When** they connect their wallet, **Then** they gain Gold tier access, receive signals 30 minutes early, and get access to exclusive Sunday deep-dive alpha reports.

3. **Given** a user holds $5,000+ worth of $RGE, **When** they connect their wallet, **Then** they gain Diamond tier access with all Gold benefits plus one custom token scan request per day delivered privately.

4. **Given** a user's wallet balance drops below their current tier threshold, **When** the next real-time verification occurs, **Then** they are automatically downgraded to the appropriate tier and lose associated benefits.

5. **Given** a Diamond tier user submits a custom token request, **When** Rogue completes the analysis, **Then** they receive a private message with comprehensive analysis, and their daily quota is marked as used until the next 24-hour reset.

---

### User Story 3 - Rogue Terminal Dashboard (Priority: P2)

Users can connect their wallet to a sleek dark-themed web interface showing live countdown timers until next signal, historical signal performance, mindshare charts, and their current tier status, providing transparency and enhancing the premium experience.

**Why this priority**: Enhances user experience and provides transparent proof of value, but the core oracle functionality (P1) must work first. This drives retention and engagement but isn't required for MVP.

**Independent Test**: Can be tested by connecting a wallet with known $RGE holdings, verifying the displayed tier matches on-chain balance, and checking that countdown timer accurately shows time remaining until next 20-minute cycle.

**Acceptance Scenarios**:

1. **Given** a user visits the Rogue Terminal, **When** they connect their wallet, **Then** the interface displays their current $RGE holdings, tier status (Silver/Gold/Diamond/None), and tier-specific benefits.

2. **Given** a user is viewing the terminal, **When** the countdown reaches zero, **Then** a new signal appears in real-time on the dashboard (with appropriate delay based on their tier).

3. **Given** past signals have been published, **When** a user views the performance section, **Then** they see historical signals with actual outcomes, hit rates, and average returns to verify Rogue's track record.

4. **Given** mindshare data is available, **When** a user views the charts section, **Then** they see visualizations of token mention trends, sentiment shifts, and KOL activity that informed recent signals.

---

### User Story 4 - Ecosystem Scanning & Signal Generation (Priority: P1)

Every 20 minutes, the system automatically scans social media (X/Twitter), blockchain data (whale transactions), and KOL activity to identify either high-conviction trading opportunities or narrative shifts, then generates appropriately formatted content.

**Why this priority**: This is the engine that powers everything. Without reliable automated scanning and signal generation, all other features are meaningless. Core technical capability.

**Independent Test**: Can be tested by triggering a manual scan cycle, injecting test data (simulated KOL tweet about a low-cap token), and verifying the system detects it, analyzes it, and generates a properly formatted signal or intel thread.

**Acceptance Scenarios**:

1. **Given** the 20-minute timer triggers, **When** the scan detects a low-cap token with sudden volume spike + KOL mentions, **Then** the system generates a BUY signal with calculated entry, target, stop-loss, confidence score, and references the specific triggering events.

2. **Given** the scan detects narrative shifts without clear trade setups, **When** mindshare surges or sentiment divergences are identified, **Then** the system generates an intel thread breaking down the trend with supporting data points.

3. **Given** multiple potential signals are identified in one cycle, **When** the system ranks them by confidence and impact, **Then** it publishes only the highest-conviction opportunity to avoid noise and maintain quality standards.

4. **Given** no significant opportunities are detected, **When** the 20-minute cycle completes, **Then** the system skips publishing rather than forcing low-quality content, maintaining credibility.

---

### Edge Cases

- What happens when a user's wallet balance changes during an active Telegram session (e.g., they sell $RGE)? System must re-verify on every signal publish and immediately restrict access if tier threshold not met.

- How does the system handle network congestion or blockchain read failures during wallet verification? Must have timeout limits (5 seconds) and fallback to last known tier for current cycle, then re-verify on next cycle.

- What if two signals have identical confidence scores? Use timestamp of detection as tiebreaker (earlier detection wins).

- What happens if a Diamond user submits multiple custom requests in one day? Only the first request is processed; subsequent requests receive an error message with countdown to quota reset.

- How does the system prevent duplicate signals? Maintain a 7-day rolling window of published tokens and skip any token already covered unless fundamentals have materially changed (new KOL involvement, major event).

- What if X/Twitter or Telegram APIs are down? Must have retry logic (3 attempts with exponential backoff) and alert monitoring so manual intervention can occur if both platforms fail.

- How are timezone differences handled for "Sunday deep-dive" delivery? Use UTC as canonical timezone; Sunday defined as 00:00-23:59 UTC.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scan the crypto ecosystem every 20 minutes, analyzing social media mentions, blockchain transactions, and KOL activity to identify trading opportunities or narrative shifts.

- **FR-002**: System MUST generate either a trading signal (including token symbol, entry price, target price, stop-loss, confidence score 1-10, and triggering event) OR an intel thread (narrative analysis with supporting data) each cycle.

- **FR-003**: System MUST publish all generated content to public X/Twitter account (@RogueSignals) immediately upon generation.

- **FR-004**: System MUST deliver the same content to private Telegram channel 15-30 minutes BEFORE public posting, with exact timing determined by user's tier.

- **FR-005**: System MUST verify user wallet $RGE holdings in real-time via on-chain data every time content is delivered to Telegram.

- **FR-006**: System MUST enforce three tier thresholds: Silver ($50-$499 worth of $RGE, 15 min early access), Gold ($500-$4,999, 30 min early + Sunday reports), Diamond ($5,000+, all Gold benefits + 1 custom request/day).

- **FR-007**: System MUST automatically downgrade users who no longer meet their tier's minimum holdings threshold on the next verification cycle.

- **FR-008**: System MUST provide a web-based "Rogue Terminal" interface where users can connect their wallet and view their tier status, countdown to next signal, historical signals, and performance metrics.

- **FR-009**: System MUST track and display historical signal performance including entry/exit prices, actual outcomes, and hit rate statistics.

- **FR-010**: System MUST allow Diamond tier users to submit one custom token analysis request per 24-hour period, delivered privately to their Telegram.

- **FR-011**: System MUST prevent duplicate signals by maintaining a 7-day cache of covered tokens unless material new information is detected.

- **FR-012**: System MUST implement retry logic for external API failures (X, Telegram, blockchain RPC) with 3 attempts and exponential backoff.

- **FR-013**: Gold tier users MUST receive exclusive Sunday deep-dive alpha reports delivered between 00:00-23:59 UTC on Sundays.

- **FR-014**: System MUST only publish high-confidence signals; if no opportunities meet quality thresholds in a cycle, skip publishing rather than force low-quality content.

- **FR-015**: System MUST timestamp all signals and enforce early-access windows precisely (Silver users receive content at T-15min, Gold at T-30min, public at T).

### Key Entities

- **Signal**: A trading recommendation containing token identifier, entry price range, target price, stop-loss price, confidence score (1-10 scale), triggering event description (KOL mention/whale move/news), timestamp, and outcome tracking (actual performance post-publication).

- **Intel Thread**: Market analysis content covering narrative shifts, mindshare metrics (mention volume trends), sentiment analysis, KOL activity patterns, whale transaction patterns, and supporting data visualizations.

- **User**: Identified by wallet address, with current $RGE holdings (in USD value), assigned tier (None/Silver/Gold/Diamond), Telegram chat ID for delivery, custom request quota (Diamond tier only), and last verification timestamp.

- **Scan Cycle**: A 20-minute automated process that collects social media data, blockchain data, KOL activity, analyzes patterns, scores opportunities, and generates output (signal or intel thread or skip).

- **Tier Threshold**: Configuration defining minimum $RGE holdings required for each tier: Silver ($50), Gold ($500), Diamond ($5000), along with associated benefits and early-access timing.

- **Custom Request**: Diamond tier feature allowing one token analysis per day, containing requested token symbol, requestor wallet address, request timestamp, completion status, and delivery timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System completes full scan cycle and publishes content (or makes skip decision) within 20 minutes ±30 seconds of each cycle start, 99% of the time.

- **SC-002**: Wallet verification via on-chain data completes within 5 seconds per user, allowing real-time tier enforcement even with 1000+ Telegram channel members.

- **SC-003**: Early access windows are enforced accurately: Silver tier users receive content exactly 15 minutes before public, Gold tier exactly 30 minutes before, with <10 second variance.

- **SC-004**: Users can connect their wallet to Rogue Terminal and see their tier status update within 3 seconds of wallet connection.

- **SC-005**: Published signals achieve a 60%+ "win rate" (price reaches target before stop-loss) measured over 30-day rolling windows, demonstrating genuine alpha.

- **SC-006**: System maintains 99.5% uptime for both X/Twitter publishing and Telegram delivery over any 30-day period.

- **SC-007**: Diamond tier custom requests are fulfilled within 24 hours of submission, with private delivery to requestor.

- **SC-008**: Historical performance data shows all past signals with timestamps, entry/exit prices, and outcomes, allowing independent verification of track record.

- **SC-009**: Frontend dashboard loads and displays user tier, countdown, and historical data within 2 seconds on initial page load.

- **SC-010**: $RGE token holder count increases by 20%+ month-over-month in first 3 months post-launch, indicating effective FOMO mechanism and utility demonstration.

## Assumptions *(optional)*

- $RGE token is already deployed on a supported blockchain with public RPC endpoints for balance queries.
- X/Twitter API access is available with sufficient rate limits for posting every 20 minutes.
- Telegram Bot API access is available for private channel management and message delivery.
- Real-time crypto price feeds (for $RGE USD conversion and signal entry/target prices) are available via public APIs (CoinGecko, CoinMarketCap, or DEX aggregators).
- KOL accounts and whale wallets to monitor are pre-identified or discoverable through social graph analysis.
- Users understand crypto wallet connection and sign-in procedures (no onboarding tutorial required for MVP).
- Early access timing creates sufficient value to justify $RGE purchases despite being measured in minutes, not hours.

## Constraints *(optional)*

- Must comply with X/Twitter API rate limits and content policies (no financial advice disclaimers required, but monitor for platform risk).
- Telegram Bot API has message size limits (~4096 characters); intel threads may need chunking into multiple messages.
- On-chain wallet verification latency depends on blockchain RPC response times; must handle delays gracefully.
- Custom requests (Diamond tier) are manual/semi-automated; cannot guarantee instant delivery, only 24-hour SLA.
- Signal generation relies on external data sources (social media APIs, blockchain explorers); accuracy depends on data quality and coverage.

## Out of Scope *(optional)*

- Automated trade execution (users must manually enter trades based on signals).
- Portfolio tracking or profit/loss calculation for individual users.
- Community chat or social features within Telegram (channel is broadcast-only for signals).
- Mobile native apps (web-based terminal is sufficient for MVP).
- Multi-chain support beyond the initial $RGE token deployment chain (future expansion).
- Historical data export or API access for third-party integrations.
- Referral programs or affiliate tracking for $RGE holder growth.
- Customer support chat or ticketing system (community management via separate channels).
