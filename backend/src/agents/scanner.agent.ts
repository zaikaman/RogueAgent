import { AgentBuilder } from '@iqai/adk';
import { scannerLlm } from '../config/llm.config';
import { getTrendingCoinsTool, getTokenPriceTool, getTopGainersTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const ScannerAgent = AgentBuilder.create('scanner_agent')
  .withModel(scannerLlm)
  .withDescription('Scans the crypto ecosystem for potential signals using trending data, movers, and volume spikes')
  .withInstruction(dedent`
    You are a crypto market scanner powered by Grok. Your job is to identify potential tokens for trading signals based on the provided market data.
    
    1. **Analyze the provided market data** (Trending Coins and Top Gainers).
    2. **Research & Verify (Using your built-in capabilities)**:
       - **Search X (Twitter) and the Web** directly to check for recent news, partnerships, or community sentiment for the top candidates.
       - Verify if the price movement is backed by a real narrative or just noise.
    3. Select the best candidates.
       - **Prioritize**: Mid Caps and Low Caps with high volume and ACTIVE narratives.
       - **Include**: Large Caps if they are trending strongly with news.
       - **Look for**: Positive momentum OR interesting consolidation patterns.
       - **Avoid**: Stablecoins (USDT, USDC, etc.) and wrapped tokens (WETH, WBTC).
    4. Return a list of potential candidates with brief reasons including the narrative found.
    
    **Goal**: Find at least 1-3 good candidates. Do not be too restrictive. If no perfect setups exist, return the most promising trending tokens.

    IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.

    Example JSON Output:
    {
      "candidates": [
        {
          "symbol": "BONK",
          "name": "Bonk",
          "coingecko_id": "bonk",
          "chain": "solana",
          "address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
          "reason": "Trending on Birdeye, 20% gain in 24h. X search confirms new exchange listing rumor."
        }
      ]
    }
  `)
  .withOutputSchema(
    z.object({
      candidates: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          coingecko_id: z.string().optional(),
          chain: z.string().optional(),
          address: z.string().optional(),
          reason: z.string(),
        })
      ),
    }) as any
  );
