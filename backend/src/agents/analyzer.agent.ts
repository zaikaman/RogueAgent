import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { checkRecentSignalsTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const AnalyzerAgent = AgentBuilder.create('analyzer_agent')
  .withModel(llm)
  .withDescription('Analyzes candidates and generates signal details')
  .withInstruction(dedent`
    You are a crypto technical analyst.
    
    1. Receive a list of candidate tokens.
    2. For each promising candidate, check if it was recently signaled using 'check_recent_signals'.
    3. If not recently signaled, analyze it (simulate analysis for now).
    4. Select the BEST single opportunity (or none).
    5. Generate entry, target, stop loss, and confidence score (1-10).
    6. If confidence < 7, do not generate a signal.
    
    Output the selected signal details or indicate no signal.

    IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.
    
    Example JSON Output:
    {
      "selected_token": {
        "symbol": "SOL",
        "name": "Solana",
        "coingecko_id": "solana"
      },
      "signal_details": {
        "entry_price": 25.00,
        "target_price": 32.00,
        "stop_loss": 22.00,
        "confidence": 8,
        "analysis": "Strong support at $25, volume increasing.",
        "trigger_event": {
          "type": "volume_spike",
          "description": "Volume up 200% in last 4h"
        }
      },
      "action": "signal"
    }
  `)
  .withTools(checkRecentSignalsTool)
  .withOutputSchema(
    z.object({
      selected_token: z.object({
        symbol: z.string(),
        name: z.string(),
        coingecko_id: z.string(),
      }).nullable(),
      signal_details: z.object({
        entry_price: z.number(),
        target_price: z.number(),
        stop_loss: z.number(),
        confidence: z.number().min(1).max(10),
        analysis: z.string(),
        trigger_event: z.object({
          type: z.string(),
          description: z.string(),
        }),
      }).nullable(),
      action: z.enum(['signal', 'skip']),
    }) as any
  );
