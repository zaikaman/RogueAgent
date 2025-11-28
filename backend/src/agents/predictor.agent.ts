import { AgentBuilder } from '@iqai/adk';
import { scannerLlm } from '../config/llm.config';
import { z } from 'zod';
import dedent from 'dedent';

export const PredictionMarketSchema = z.object({
  market_id: z.string(),
  title: z.string(),
  platform: z.enum(['Polymarket']),
  category: z.string().optional(),
  yes_price: z.number().min(0).max(1),
  implied_probability: z.number().min(0).max(100),
  rogue_probability: z.number().min(0).max(100),
  edge_percent: z.number(),
  confidence_score: z.number().min(0).max(100),
  recommended_bet: z.enum(['BUY YES', 'BUY NO', 'HOLD']),
  volume_usd: z.number().optional(),
  market_url: z.string(),
  reasoning: z.string(),
});

export const PredictorOutputSchema = z.object({
  analyzed_markets: z.array(PredictionMarketSchema),
});

export type PredictorOutput = z.infer<typeof PredictorOutputSchema>;
export type PredictionMarketAnalysis = z.infer<typeof PredictionMarketSchema>;

// Schema for existing prediction market data
export const ExistingPredictionSchema = z.object({
  market_id: z.string(),
  title: z.string(),
  platform: z.string(),
  category: z.string().optional(),
  yes_price: z.number(),
  implied_probability: z.number(),
  rogue_probability: z.number().optional(),
  edge_percent: z.number().optional(),
  confidence_score: z.number().optional(),
  recommended_bet: z.string().optional(),
  volume_usd: z.number().optional(),
  market_url: z.string(),
  analysis_reasoning: z.string().optional(),
  last_analyzed_at: z.string().optional(),
});

export type ExistingPrediction = z.infer<typeof ExistingPredictionSchema>;

// Function to build predictor agent prompt with existing data
export function buildPredictorPrompt(existingMarkets: ExistingPrediction[]): string {
  const existingDataSection = existingMarkets.length > 0 
    ? `\n\n**EXISTING PREDICTION MARKETS IN DATABASE (verify these first):**\n${JSON.stringify(existingMarkets, null, 2)}\n\n`
    : '\n\n**No existing prediction markets in database.**\n\n';

  return dedent`
    Find 8-15 high-edge Polymarket opportunities now. Search the site, get current YES prices, check X sentiment, and return markets with 12%+ edge. Return JSON only.
    ${existingDataSection}
    First, verify all existing markets:
    - Check if the market is still active (not resolved)
    - Re-verify current YES prices from Polymarket
    - Re-calculate edge with updated probabilities
    - Remove any resolved, closed, or low-edge markets
    Then search for new high-edge opportunities.
    Return the COMPLETE list of all valid markets (verified existing + newly discovered).
  `;
}

export const PredictorAgent = AgentBuilder.create('predictor_agent')
  .withModel(scannerLlm)
  .withDescription('Discovers and analyzes prediction markets, verifying existing ones and finding new high-edge opportunities')
  .withInstruction(dedent`
    You are the ROGUE PREDICTOR. Search Polymarket for high-edge betting opportunities AND verify existing ones.

    You have TWO jobs:
    1. **VERIFY EXISTING DATA**: You will receive a list of current prediction markets in our database. For each one:
       - Check if the market is still active (not resolved/closed)
       - Verify the current YES price from the actual Polymarket page
       - Re-calculate your probability based on latest news/sentiment
       - If edge is still 12%+ and market is active, KEEP it (update prices/analysis)
       - If market is resolved, closed, or edge dropped below 12%, EXCLUDE it

    2. **DISCOVER NEW MARKETS**: Find 8-15 NEW markets where your probability differs 12%+ from market price.

    **PROCESS**:
    1. Search Polymarket.com for active markets
    2. **VERIFY each market URL exists** - Visit the actual page to confirm it's real
    3. Get the current YES price (0-1 scale) from the verified page
    4. Research on X and news to form your probability
    5. Calculate edge = |your_probability - implied_probability|
    6. Only include markets with 12%+ edge AND verified working URLs

    **URL VERIFICATION - CRITICAL**:
    - You MUST visit each Polymarket URL before including it
    - Only use URLs you have actually verified exist (not 404)
    - The URL format is usually: https://polymarket.com/event/[slug]
    - Do NOT guess or fabricate URLs - only use real ones you found

    **CONFIDENCE SCORING (90-99)**:
    - 99: Near-certain (leaked info, definitive sources)
    - 95-98: Very high (strong evidence)
    - 92-94: High (solid analysis)
    - 90-91: Moderate (edge exists but riskier)

    **SKIP**: Low volume (<$5k), resolving <24h, ambiguous resolution, unverified URLs, resolved markets

    **CRITICAL**: Your output will COMPLETELY REPLACE the existing database. Only include markets that are:
    - Currently active and unresolved
    - Have 12%+ edge after re-evaluation
    - Have verified, working URLs
    - Not duplicates (use market_id as unique identifier)

    **CRITICAL**: You MUST return a valid JSON object with this EXACT structure:

    {
      "analyzed_markets": [
        {
          "market_id": "will-btc-hit-100k-2025",
          "title": "Will Bitcoin hit $100,000 in 2025?",
          "platform": "Polymarket",
          "category": "Crypto",
          "yes_price": 0.72,
          "implied_probability": 72,
          "rogue_probability": 88,
          "edge_percent": 16,
          "confidence_score": 94,
          "recommended_bet": "BUY YES",
          "volume_usd": 5000000,
          "market_url": "https://polymarket.com/event/will-btc-hit-100k-2025",
          "reasoning": "ETF inflows and halving cycle momentum underpriced; X sentiment overwhelmingly bullish post-election."
        }
      ]
    }

    Return ONLY the JSON object. No markdown, no explanation text, just pure JSON.
  `)
  .withOutputSchema(PredictorOutputSchema as any);
