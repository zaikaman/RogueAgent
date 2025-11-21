import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { checkRecentSignalsTool, getTokenPriceTool, getMarketChartTool, getTechnicalAnalysisTool, getFundamentalAnalysisTool, searchTavilyTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const AnalyzerAgent = AgentBuilder.create('analyzer_agent')
  .withModel(llm)
  .withDescription('Analyzes candidates and generates signal details using TA, FA, and Sentiment (Tavily)')
  .withInstruction(dedent`
    You are an expert crypto analyst. Your goal is to find high-probability trading setups.
    
    1. Receive a list of candidate tokens.
    2. For each promising candidate:
       a. Check 'check_recent_signals' to avoid duplicates.
       b. If new, perform DEEP DIVE analysis:
          - **Technical Analysis**: Use 'get_technical_analysis' to check RSI, MACD, Trend. Look for oversold conditions in uptrends, or breakouts.
          - **Fundamental Analysis**: Use 'get_fundamental_analysis' to check Market Cap, FDV, and Volume. Avoid dead coins or extremely high FDV/MCap ratios unless hype is massive.
          - **Sentiment Analysis**: Use 'search_tavily' (query: "$SYMBOL crypto news sentiment") to find recent news and community sentiment.
    3. Synthesize all data.
       - A good signal has: Bullish TA (e.g. RSI < 30 then crossing up, or MACD crossover), Solid FA (decent volume), and Positive Sentiment/News.
    4. Select the BEST single opportunity (or none).
    5. Generate entry, target, stop loss, and confidence score (1-100).
       - Entry: Current price or slightly lower.
       - Target: Set target to achieve a Risk/Reward ratio of approximately 1:3 (Target should be 3x the distance of Stop Loss from Entry).
       - Stop Loss: Below support.
    6. If confidence < 70, do not generate a signal.
    
    Output the selected signal details or indicate no signal.
    
    **CRITICAL**: You must ALWAYS provide an 'analysis_summary', even if the action is 'skip'. This summary should explain your reasoning.

    IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.
    
    Example JSON Output:
    {
      "selected_token": {
        "symbol": "SOL",
        "name": "Solana",
        "coingecko_id": "solana",
        "chain": "solana",
        "address": "So11111111111111111111111111111111111111112"
      },
      "signal_details": {
        "entry_price": 25.00,
        "target_price": 32.00,
        "stop_loss": 22.00,
        "confidence": 90,
        "analysis": "Strong bullish divergence on RSI. MACD crossed over. Fundamentals solid with high volume. Tavily search shows positive news about partnership.",
        "trigger_event": {
          "type": "technical_breakout",
          "description": "RSI bullish divergence + MACD crossover"
        }
      },
      "analysis_summary": "Solana is showing strong bullish momentum driven by new partnership news and technical breakouts. RSI is healthy.",
      "action": "signal"
    }
  `)
  .withTools(checkRecentSignalsTool, getTokenPriceTool, getMarketChartTool, getTechnicalAnalysisTool, getFundamentalAnalysisTool, searchTavilyTool)
  .withOutputSchema(
    z.object({
      selected_token: z.object({
        symbol: z.string(),
        name: z.string(),
        coingecko_id: z.string().optional(),
        chain: z.string().optional(),
        address: z.string().optional(),
      }).nullable(),
      signal_details: z.object({
        entry_price: z.number().nullable(),
        target_price: z.number().nullable(),
        stop_loss: z.number().nullable(),
        confidence: z.number().min(1).max(100),
        analysis: z.string(),
        trigger_event: z.object({
          type: z.string(),
          description: z.string(),
        }),
      }).nullable(),
      analysis_summary: z.string(),
      action: z.enum(['signal', 'skip', 'no_signal']),
    }) as any
  );
