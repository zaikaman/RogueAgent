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
          - **Price Check**: Use 'get_token_price' (provide chain and address if available) to get the accurate current price.
          - **Technical Analysis**: Use 'get_technical_analysis' (provide chain and address) to check RSI, MACD, Trend. Look for oversold conditions in uptrends, or breakouts.
          - **Fundamental Analysis**: Use 'get_fundamental_analysis' (provide chain and address if available) to check Market Cap, FDV, and Volume. Avoid dead coins or extremely high FDV/MCap ratios unless hype is massive.
          - **Sentiment Analysis**: Use 'search_tavily' (query: "$SYMBOL crypto news sentiment") to find recent news and community sentiment.
    3. Synthesize all data.
       - A good signal has: Bullish TA (e.g. RSI < 30 then crossing up, or MACD crossover), Solid FA (decent volume), and Positive Sentiment/News.
       - **Market Context**: If the general market is bearish (e.g. BTC dropping), be EXTREMELY selective. Only signal if there is a massive, independent catalyst.
    4. Select the BEST single opportunity (or none).
    5. Generate entry, target, stop loss, and confidence score (1-100).
       - **Order Type**: Decide if this is a 'market' buy (immediate) or 'limit' buy (wait for price).
       - **Limit Orders**: If the price is extended, set a 'limit' order at a support level (pullback). This is PREFERRED for better R:R.
       - Entry: Current price (for market) or Support Level (for limit).
       - Target: Set target to achieve a Risk/Reward ratio of approximately 1:3.
       - Stop Loss: Below support.
    6. **Strict Filtering**:
       - If confidence < 80, do not generate a signal.
       - If the setup looks "forced" or "weak", choose 'no_signal'.
       - It is better to have NO signal than a losing signal.
    
    Output the selected signal details or indicate no signal.
    
    **CRITICAL**: You must ALWAYS provide an 'analysis_summary', even if the action is 'skip'. This summary should explain your reasoning.

    IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.
    
    Example JSON Output (Market Order):
    {
      "selected_token": {
        "symbol": "SOL",
        "name": "Solana",
        "coingecko_id": "solana",
        "chain": "solana",
        "address": "So11111111111111111111111111111111111111112"
      },
      "signal_details": {
        "order_type": "market",
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
    
    Example JSON Output (Limit Order):
    {
      "selected_token": {
        "symbol": "ETH",
        "name": "Ethereum",
        "coingecko_id": "ethereum",
        "chain": "ethereum",
        "address": null
      },
      "signal_details": {
        "order_type": "limit",
        "entry_price": 1800.00,
        "target_price": 2100.00,
        "stop_loss": 1700.00,
        "confidence": 85,
        "analysis": "ETH is bullish but overextended. Setting limit at key support level for better R:R.",
        "trigger_event": {
          "type": "pullback_to_support",
          "description": "Waiting for retest of $1800 support"
        }
      },
      "analysis_summary": "Ethereum shows strength but needs a healthy pullback for optimal entry.",
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
        address: z.string().nullable().optional(),
      }).nullable(),
      signal_details: z.object({
        order_type: z.enum(['market', 'limit']).default('market'),
        entry_price: z.number().nullable(),
        target_price: z.number().nullable(),
        stop_loss: z.number().nullable(),
        confidence: z.number().min(1).max(100),
        analysis: z.string(),
        trigger_event: z.object({
          type: z.string(),
          description: z.string(),
        }).nullable(),
      }).nullable(),
      analysis_summary: z.string(),
      action: z.enum(['signal', 'skip', 'no_signal']),
    }) as any
  );
