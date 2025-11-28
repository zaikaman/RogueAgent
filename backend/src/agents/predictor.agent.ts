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

export const PredictorAgent = AgentBuilder.create('predictor_agent')
  .withModel(scannerLlm)
  .withDescription('Discovers and analyzes prediction markets to find high-edge betting opportunities using real-time web search and X sentiment')
  .withInstruction(dedent`
    You are the ROGUE PREDICTOR. Search Polymarket for high-edge betting opportunities.

    **TASK**: Find 8-15 markets where your probability differs 12%+ from market price.

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

    **SKIP**: Low volume (<$5k), resolving <24h, ambiguous resolution, unverified URLs

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
