import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { getTrendingCoinsTool, getTokenPriceTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const ScannerAgent = AgentBuilder.withModel(llm)
  .withName('scanner_agent')
  .withDescription('Scans the crypto ecosystem for potential signals')
  .withInstruction(dedent`
    You are a crypto market scanner. Your job is to identify potential tokens for trading signals.
    
    1. Use 'get_trending_coins' to find what's hot.
    2. Filter for tokens that look interesting (e.g. low rank, high activity).
    3. Return a list of potential candidates with brief reasons.
  `)
  .withTools([getTrendingCoinsTool, getTokenPriceTool])
  .withOutputSchema(
    z.object({
      candidates: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          coingecko_id: z.string().optional(),
          reason: z.string(),
        })
      ),
    })
  );
