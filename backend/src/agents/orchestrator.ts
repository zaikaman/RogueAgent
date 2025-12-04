import { ScannerAgent } from './scanner.agent';
import { AnalyzerAgent } from './analyzer.agent';
import { GeneratorAgent } from './generator.agent';
import { WriterAgent } from './writer.agent';
import { IntelAgent } from './intel.agent';
import { YieldAgent, buildYieldPrompt, ExistingYield } from './yield.agent';
import { AirdropAgent, buildAirdropPrompt, ExistingAirdrop } from './airdrop.agent';
import { logger } from '../utils/logger.util';
import { cleanSignalText, formatSignalTweet, formatIntelTweet } from '../utils/text.util';
import { TechnicalAnalysis } from '../utils/ta.util';
import { supabaseService } from '../services/supabase.service';
import { binanceService } from '../services/binance.service';
import { proChartService } from '../services/pro-chart.service';
import { callVisionLLM, createVisionMessage, createMultiImageVisionMessage } from '../services/vision-llm.service';
import { randomUUID } from 'crypto';
import { telegramService } from '../services/telegram.service';
import { coingeckoService } from '../services/coingecko.service';
import { coinMarketCapService } from '../services/coinmarketcap.service';
import { birdeyeService } from '../services/birdeye.service';
import { defillamaService } from '../services/defillama.service';
import { zImageService } from '../services/zimage.service';
import { TIERS } from '../constants/tiers';
import { scheduledPostService } from '../services/scheduled-post.service';
import { getCoingeckoId } from '../constants/coingecko-ids.constant';
import { signalExecutorService } from '../services/signal-executor.service';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE VALIDATION UTILITY
// Prevents hallucinated prices from LLM from causing bad trades
// ═══════════════════════════════════════════════════════════════════════════════
async function validateSignalPrice(
  symbol: string,
  entryPrice: number,
  orderType: 'market' | 'limit' = 'market'
): Promise<{ valid: boolean; realPrice: number | null; deviation: number | null; error?: string }> {
  try {
    // Try to get real price from Binance (most reliable for futures symbols)
    let realPrice: number | null = null;
    
    try {
      realPrice = await binanceService.getPrice(symbol);
    } catch (e) {
      logger.warn(`Failed to get Binance price for ${symbol}, trying CoinMarketCap...`);
    }
    
    // Fallback to CoinMarketCap
    if (!realPrice) {
      try {
        const cmcData = await coinMarketCapService.getPriceWithChange(symbol);
        realPrice = cmcData?.price || null;
      } catch (e) {
        logger.warn(`Failed to get CMC price for ${symbol}, trying CoinGecko...`);
      }
    }
    
    // Fallback to CoinGecko
    if (!realPrice) {
      try {
        const coingeckoId = getCoingeckoId(symbol);
        if (coingeckoId) {
          realPrice = await coingeckoService.getPrice(coingeckoId);
        }
      } catch (e) {
        logger.warn(`Failed to get CoinGecko price for ${symbol}`);
      }
    }
    
    if (!realPrice) {
      return { valid: false, realPrice: null, deviation: null, error: `Could not fetch real price for ${symbol}` };
    }
    
    // Calculate deviation
    const deviation = Math.abs((entryPrice - realPrice) / realPrice) * 100;
    
    // Market orders: entry price should be very close to current price (within 5%)
    // Limit orders: more lenient (within 15%) since they're waiting for a specific price
    const maxDeviation = orderType === 'market' ? 5 : 15;
    
    if (deviation > maxDeviation) {
      return {
        valid: false,
        realPrice,
        deviation,
        error: `Entry price $${entryPrice} deviates ${deviation.toFixed(1)}% from real price $${realPrice.toFixed(4)}. Max allowed: ${maxDeviation}% for ${orderType} orders. LLM may have hallucinated the price.`
      };
    }
    
    return { valid: true, realPrice, deviation };
  } catch (error) {
    logger.error(`Price validation error for ${symbol}:`, error);
    return { valid: false, realPrice: null, deviation: null, error: `Price validation failed: ${error}` };
  }
}

interface ScannerResult {
  candidates?: Array<{
    symbol: string;
    name: string;
    coingecko_id?: string;
    reason: string;
  }>;
  analysis?: {
    symbol: string;
    name: string;
    current_price_usd?: number;
    market_cap?: number;
    volume_24h?: number;
    price_action?: any;
    top_narratives?: string[];
    on_chain_anomalies?: any;
    price_driver_summary?: string;
  };
}

interface AnalyzerResult {
  action: 'signal' | 'skip' | 'no_signal';
  analysis_summary: string;
  selected_token: {
    symbol: string;
    name: string;
    coingecko_id?: string;
    chain?: string;
    address?: string | null;
  } | null;
  signal_details: {
    direction?: 'LONG' | 'SHORT';
    order_type?: 'market' | 'limit';
    trading_style?: 'day_trade' | 'swing_trade';
    current_price?: number;
    entry_price: number | null;
    target_price: number | null;
    stop_loss: number | null;
    confidence: number;
    analysis: string;
    trigger_event: {
      type: string;
      description: string;
    } | null;
    confluences_count?: number;
    mtf_alignment_score?: number;
    risk_reward_ratio?: number;
  } | null;
}

/**
 * Signal Quality Validator - Programmatic enforcement of strict quality criteria
 * This catches signals that slip through the LLM's judgment
 */
interface SignalQualityResult {
  isValid: boolean;
  reasons: string[];
  metrics: {
    confidence: number;
    riskRewardRatio: number;
    stopLossPercent: number;
    confluencesCount: number;
    mtfAlignmentScore: number;
  };
}

function validateSignalQuality(result: AnalyzerResult): SignalQualityResult {
  const reasons: string[] = [];
  const details = result.signal_details;
  
  if (!details || !details.entry_price || !details.target_price || !details.stop_loss) {
    return {
      isValid: false,
      reasons: ['Missing required price levels'],
      metrics: { confidence: 0, riskRewardRatio: 0, stopLossPercent: 0, confluencesCount: 0, mtfAlignmentScore: 0 }
    };
  }

  const entry = details.entry_price;
  const target = details.target_price;
  const stop = details.stop_loss;
  const confidence = details.confidence;
  
  // Determine direction
  const isLong = target > entry;
  
  // Calculate R:R
  const risk = isLong ? Math.abs(entry - stop) : Math.abs(stop - entry);
  const reward = isLong ? Math.abs(target - entry) : Math.abs(entry - target);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;
  
  // Calculate stop loss percentage
  const stopLossPercent = isLong 
    ? ((entry - stop) / entry) * 100 
    : ((stop - entry) / entry) * 100;
  
  // Get optional quality metrics (default to passing if not provided)
  const confluencesCount = details.confluences_count || 2; // Assume minimum if not specified
  const mtfAlignmentScore = details.mtf_alignment_score || 50; // Assume minimum if not specified

  // VALIDATION RULES (balanced - selective but not impossible)
  
  // 1. Confidence must be >= 85
  if (confidence < 85) {
    reasons.push(`Confidence ${confidence}% is below minimum 85%`);
  }
  
  // 2. Risk:Reward must be >= 1:2
  if (riskRewardRatio < 2.0) {
    reasons.push(`R:R ratio ${riskRewardRatio.toFixed(2)} is below minimum 1:2`);
  }
  
  // 3. Stop loss must be >= 3% from entry
  if (stopLossPercent < 3.0) {
    reasons.push(`Stop loss ${stopLossPercent.toFixed(1)}% is below minimum 3%`);
  }
  
  // 4. Stop loss shouldn't be too wide (> 15% for day trades, > 20% for swings)
  const maxStop = details.trading_style === 'swing_trade' ? 20 : 15;
  if (stopLossPercent > maxStop) {
    reasons.push(`Stop loss ${stopLossPercent.toFixed(1)}% exceeds maximum ${maxStop}% for ${details.trading_style || 'day_trade'}`);
  }
  
  // 5. Target should be realistic (not more than 50% for day trades, 100% for swings)
  const targetPercent = isLong 
    ? ((target - entry) / entry) * 100 
    : ((entry - target) / entry) * 100;
  const maxTarget = details.trading_style === 'swing_trade' ? 100 : 50;
  if (targetPercent > maxTarget) {
    reasons.push(`Target ${targetPercent.toFixed(1)}% seems unrealistic for ${details.trading_style || 'day_trade'}`);
  }
  
  // 6. Entry, stop, and target must make logical sense
  if (isLong && stop >= entry) {
    reasons.push('LONG: Stop loss must be below entry price');
  }
  if (!isLong && stop <= entry) {
    reasons.push('SHORT: Stop loss must be above entry price');
  }

  // 7. ENTRY PRICE VALIDATION - NO BUY/SELL STOP ORDERS
  // This is critical: we only allow limit and market orders
  const currentPrice = details.current_price;
  const direction = details.direction;
  
  if (currentPrice && direction) {
    if (direction === 'LONG' && entry > currentPrice) {
      // Entry above current price for LONG = buy stop order (FORBIDDEN)
      reasons.push(`LONG: Entry price $${entry.toFixed(4)} is ABOVE current price $${currentPrice.toFixed(4)} - this would be a BUY STOP order which is NOT allowed. Entry must be <= current price.`);
    }
    if (direction === 'SHORT' && entry < currentPrice) {
      // Entry below current price for SHORT = sell stop order (FORBIDDEN)
      reasons.push(`SHORT: Entry price $${entry.toFixed(4)} is BELOW current price $${currentPrice.toFixed(4)} - this would be a SELL STOP order which is NOT allowed. Entry must be >= current price.`);
    }
  } else if (!direction) {
    // Infer direction from target vs entry if not provided
    if (isLong && currentPrice && entry > currentPrice * 1.02) {
      // Allow 2% tolerance for market orders, but reject clear buy stops
      reasons.push(`LONG inferred: Entry price $${entry.toFixed(4)} is significantly above current price $${currentPrice?.toFixed(4) || 'unknown'} - possible buy stop order`);
    }
    if (!isLong && currentPrice && entry < currentPrice * 0.98) {
      // Allow 2% tolerance for market orders, but reject clear sell stops
      reasons.push(`SHORT inferred: Entry price $${entry.toFixed(4)} is significantly below current price $${currentPrice?.toFixed(4) || 'unknown'} - possible sell stop order`);
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    metrics: {
      confidence,
      riskRewardRatio,
      stopLossPercent,
      confluencesCount,
      mtfAlignmentScore
    }
  };
}

interface GeneratorResult {
  formatted_content: string;
  tweet_text?: string;
  blog_post?: string;
  image_prompt?: string;
  log_message?: string;
}

interface PublisherResult {
  twitter_post_id: string | null;
  telegram_sent?: boolean;
  status: 'posted' | 'failed' | 'skipped';
}

interface IntelResult {
  topic: string;
  insight: string;
  importance_score: number;
}

interface WriterResult {
  headline: string;
  content: string;
  tldr: string;
}

export class Orchestrator extends EventEmitter {
  private logs: Array<{ id: number; message: string; type: string; timestamp: number; data?: any }> = [];
  private logCounter = 0;
  
  private broadcast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', data?: any) {
    const log = { id: ++this.logCounter, message, type, timestamp: Date.now(), data };
    this.logs.push(log);
    // Keep last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    this.emit('log', log);
  }

  public getLogs(afterId?: number) {
    if (afterId === undefined) return this.logs;
    return this.logs.filter(log => log.id > afterId);
  }

  async runSwarm() {
    const runId = randomUUID();
    const startTime = Date.now();
    logger.info(`Starting swarm run ${runId}`);
    this.broadcast(`Initializing Rogue Swarm Protocol... Run ID: ${runId.slice(0, 8)}`, 'info');

    try {
      // Fetch data manually to avoid tool calling issues with custom LLM
      logger.info('Fetching market data...');
      this.broadcast('Establishing connection to global market data feeds...', 'info');
      const [trendingCg, trendingBe, topGainers, defiChains, defiProtocols, bitcoinData, btcOhlcv] = await Promise.all([
        coingeckoService.getTrending().catch(e => { logger.error('CG Trending Error', e); return []; }),
        birdeyeService.getTrendingTokens(10).catch(e => { logger.error('Birdeye Trending Error', e); return []; }),
        coingeckoService.getTopGainersLosers().catch(e => { logger.error('CG Gainers Error', e); return []; }),
        defillamaService.getGlobalTVL().catch(e => { logger.error('DeFi Llama Chains Error', e); return []; }),
        defillamaService.getProtocolStats().catch(e => { logger.error('DeFi Llama Protocols Error', e); return []; }),
        (async () => {
            try {
                const price = await coinMarketCapService.getPriceWithChange('BTC');
                if (price) return price;
                throw new Error('CMC returned null');
            } catch (e) {
                logger.warn('CMC BTC Price Error, falling back to CG');
                return coingeckoService.getPriceWithChange('bitcoin').catch(e2 => { logger.error('CG BTC Price Error', e2); return null; });
            }
        })(),
        // Fetch BTC OHLCV for technical analysis
        binanceService.getOHLCV('BTC', '4h', 30).catch(e => { logger.error('Binance BTC OHLCV Error', e); return []; })
      ]);

      // Calculate BTC Technical Analysis
      let btcTechnicalAnalysis: any = null;
      if (btcOhlcv && btcOhlcv.length > 20) {
        try {
          const prices = btcOhlcv.map((c: any) => c.close);
          const currentPrice = prices[prices.length - 1];
          
          // Basic indicators
          const rsi = TechnicalAnalysis.calculateRSI(prices, 14);
          const macd = TechnicalAnalysis.calculateMACD(prices);
          const latestRSI = rsi[rsi.length - 1];
          const latestMACD = macd.macd[macd.macd.length - 1];
          const latestSignal = macd.signal[macd.signal.length - 1];
          const latestHistogram = macd.histogram[macd.histogram.length - 1];
          
          // Advanced indicators
          const haCandles = TechnicalAnalysis.calculateHeikinAshi(btcOhlcv);
          const stResult = TechnicalAnalysis.calculateSuperTrend(haCandles, 10, 3);
          const currentSuperTrend = stResult.trend[stResult.trend.length - 1];
          
          const bbResult = TechnicalAnalysis.calculateBollingerBands(prices, 20, 2);
          const kcResult = TechnicalAnalysis.calculateKeltnerChannel(btcOhlcv, 20, 2);
          const currentBBUpper = bbResult.upper[bbResult.upper.length - 1];
          const currentBBLower = bbResult.lower[bbResult.lower.length - 1];
          const currentKCUpper = kcResult.upper[kcResult.upper.length - 1];
          const currentKCLower = kcResult.lower[kcResult.lower.length - 1];
          const bbSqueeze = bbResult.squeeze;
          const breakout = (currentPrice > currentKCUpper || currentPrice < currentKCLower) && bbSqueeze;
          
          // CVD for accumulation/distribution
          const cvdResult = TechnicalAnalysis.calculateCVD(btcOhlcv);
          
          // MTF Alignment
          const mtfResult = TechnicalAnalysis.calculateMTFAlignment(prices);
          
          // Fibonacci levels
          const swingPoints = TechnicalAnalysis.detectSwingPoints(btcOhlcv, 20);
          const fibResult = TechnicalAnalysis.calculateFibonacci(swingPoints.swingHigh, swingPoints.swingLow);
          
          btcTechnicalAnalysis = {
            current_price: currentPrice,
            rsi: {
              value: latestRSI?.toFixed(1),
              signal: latestRSI > 70 ? 'OVERBOUGHT' : latestRSI < 30 ? 'OVERSOLD' : 'NEUTRAL',
              description: latestRSI > 70 ? 'Overbought - potential reversal/pullback' : latestRSI < 30 ? 'Oversold - potential bounce' : 'Neutral momentum'
            },
            macd: {
              macd_line: latestMACD?.toFixed(2),
              signal_line: latestSignal?.toFixed(2),
              histogram: latestHistogram?.toFixed(2),
              signal: latestHistogram > 0 ? 'BULLISH' : 'BEARISH',
              crossover: latestHistogram > 0 && macd.histogram[macd.histogram.length - 2] <= 0 ? 'BULLISH_CROSS' : 
                        latestHistogram < 0 && macd.histogram[macd.histogram.length - 2] >= 0 ? 'BEARISH_CROSS' : 'NONE'
            },
            supertrend: {
              trend: currentSuperTrend?.toUpperCase(),
              level: stResult.supertrend[stResult.supertrend.length - 1]?.toFixed(2),
              description: currentSuperTrend === 'up' ? 'Bullish - price above SuperTrend support' : 'Bearish - price below SuperTrend resistance'
            },
            bollinger_squeeze: {
              squeeze: bbSqueeze,
              breakout: breakout,
              breakout_direction: currentPrice > currentKCUpper ? 'BULLISH' : currentPrice < currentKCLower ? 'BEARISH' : 'NONE',
              description: breakout ? `Volatility breakout ${currentPrice > currentKCUpper ? 'UP' : 'DOWN'}` : 
                          bbSqueeze ? 'Bollinger squeeze - breakout imminent' : 'Normal volatility'
            },
            cvd: {
              divergence: cvdResult.divergence,
              description: cvdResult.divergence ? 'CVD divergence detected - potential reversal' : 'No divergence'
            },
            mtf_alignment: {
              score: mtfResult.score?.toFixed(0),
              bias: mtfResult.bias?.toUpperCase(),
              aligned: mtfResult.aligned,
              description: mtfResult.aligned && mtfResult.score > 75 
                ? `Strong ${mtfResult.bias} trend - all timeframes aligned` 
                : mtfResult.score > 50 
                ? `Moderate ${mtfResult.bias} bias` 
                : 'Choppy - no clear trend'
            },
            fibonacci: {
              swing_high: swingPoints.swingHigh?.toFixed(2),
              swing_low: swingPoints.swingLow?.toFixed(2),
              key_levels: {
                '38.2%': fibResult.retracement['38.2']?.toFixed(2),
                '50%': fibResult.retracement['50']?.toFixed(2),
                '61.8%': fibResult.retracement['61.8']?.toFixed(2)
              }
            },
            summary: (() => {
              const bullish = [];
              const bearish = [];
              if (latestRSI < 30) bullish.push('RSI oversold');
              if (latestRSI > 70) bearish.push('RSI overbought');
              if (latestHistogram > 0) bullish.push('MACD bullish');
              if (latestHistogram < 0) bearish.push('MACD bearish');
              if (currentSuperTrend === 'up') bullish.push('SuperTrend bullish');
              if (currentSuperTrend === 'down') bearish.push('SuperTrend bearish');
              if (mtfResult.bias === 'bullish' && mtfResult.score > 50) bullish.push(`MTF ${mtfResult.score.toFixed(0)}% bullish`);
              if (mtfResult.bias === 'bearish' && mtfResult.score > 50) bearish.push(`MTF ${mtfResult.score.toFixed(0)}% bearish`);
              if (breakout && currentPrice > currentKCUpper) bullish.push('BB breakout UP');
              if (breakout && currentPrice < currentKCLower) bearish.push('BB breakout DOWN');
              
              return {
                bullish_signals: bullish,
                bearish_signals: bearish,
                overall: bullish.length > bearish.length ? 'BULLISH' : bearish.length > bullish.length ? 'BEARISH' : 'NEUTRAL'
              };
            })()
          };
          logger.info('BTC Technical Analysis calculated successfully');
        } catch (e) {
          logger.error('Error calculating BTC TA:', e);
        }
      }
      const marketData = {
        global_market_context: {
          bitcoin: bitcoinData
        },
        trending_coingecko: trendingCg.map((c: any) => ({
          name: c.item.name,
          symbol: c.item.symbol,
          rank: c.item.market_cap_rank
        })),
        trending_birdeye: trendingBe.map((c: any) => ({
          name: c.name,
          symbol: c.symbol,
          rank: c.rank,
          volume24h: c.volume24hUSD
        })),
        top_gainers: topGainers.slice(0, 15).map((c: any) => ({
          name: c.name,
          symbol: c.symbol,
          change_24h: c.price_change_percentage_24h
        })),
        defi_tvl_top_chains: defiChains,
        defi_top_growing_protocols: defiProtocols
      };
      this.broadcast('Market data aggregated successfully.', 'success', marketData);

      // Check signal quota (only counts published signals, not pending)
      const recentSignals = await supabaseService.getRecentSignalCount(24);
      const shouldTrySignal = recentSignals < 3;
      logger.info(`Recent published signals (24h): ${recentSignals}. Should try signal: ${shouldTrySignal}`);

      // Fetch recent posts history to avoid repetition
      const recentPosts = await supabaseService.getRecentPosts(10);

      let signalGenerated = false;
      let analyzerResult: AnalyzerResult | null = null;

      if (shouldTrySignal) {
        // 1. Scanner - Now with BIAS-FIRST approach
        logger.info('Running Scanner Agent...');
        this.broadcast('Deploying Scanner Agent to determine market bias...', 'info');
        const { runner: scanner } = await ScannerAgent.build();
        
        // Get symbols with active (non-closed) signals to exclude
        const activeSignalSymbols = await supabaseService.getActiveSignalSymbols();
        const excludedSymbolsSection = activeSignalSymbols.length > 0 
          ? `
═══════════════════════════════════════════════════════════════════════════════
🚫 EXCLUDED SYMBOLS (Active trades - DO NOT select these)
═══════════════════════════════════════════════════════════════════════════════
The following symbols already have ACTIVE trades (market orders or unfilled limit orders).
DO NOT include any of these in your candidates list:
${activeSignalSymbols.join(', ')}
`
          : '';
        
        const scannerPrompt = `Determine the market bias and find matching trading opportunities.

═══════════════════════════════════════════════════════════════════════════════
📊 BITCOIN TECHNICAL ANALYSIS (4H TIMEFRAME)
═══════════════════════════════════════════════════════════════════════════════
${btcTechnicalAnalysis ? JSON.stringify(btcTechnicalAnalysis, null, 2) : 'BTC TA data unavailable - rely on price action and sentiment'}

═══════════════════════════════════════════════════════════════════════════════
📈 MARKET DATA
═══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(marketData, null, 2)}
        
═══════════════════════════════════════════════════════════════════════════════
📝 RECENTLY POSTED CONTENT (Avoid repeating)
═══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(recentPosts)}
${excludedSymbolsSection}
═══════════════════════════════════════════════════════════════════════════════
🔍 YOUR MISSION
═══════════════════════════════════════════════════════════════════════════════

**STEP 1: VERIFY MARKET TREND WITH RESEARCH**
Use your built-in web search AND X (Twitter) search capabilities to:
1. Search X for "BTC", "Bitcoin", "crypto market" to gauge real-time sentiment
2. Search web for latest Bitcoin news, market analysis, and macro events
3. Look for what top crypto traders and analysts are saying on X
4. Check for any breaking news that could impact market direction
5. Verify if the technical indicators align with the sentiment on X/social media

**STEP 2: DETERMINE BIAS BASED ON CONFLUENCE**
Combine the technical analysis above with your research findings:
- Do the BTC indicators (RSI, MACD, SuperTrend, MTF alignment) support LONG or SHORT?
- Does the sentiment on X support or contradict the technical signals?
- Are there any major news events or catalysts that override technicals?
- Is there clear consensus or conflicting signals?

**STEP 3: FIND CANDIDATES MATCHING YOUR BIAS**
If LONG/SHORT bias is clear, find up to 3 tokens that align.
If signals are conflicting or unclear, return NEUTRAL with empty candidates.

REMEMBER: Quality over quantity. It's better to return NEUTRAL than force a weak trade.`;
        
        const scannerResult = await this.runAgentWithRetry<ScannerResult>(
          scanner,
          scannerPrompt,
          'Scanner Agent'
        );
        logger.info('Scanner result:', scannerResult);
        
        // Log market bias
        const marketBias = (scannerResult as any).market_bias || 'UNKNOWN';
        const biasReasoning = (scannerResult as any).bias_reasoning || '';
        logger.info(`Market Bias: ${marketBias} - ${biasReasoning}`);
        this.broadcast(`Scanner determined ${marketBias} bias. Found ${scannerResult.candidates?.length || 0} candidates.`, 'success', scannerResult);
        
        // Skip if NEUTRAL bias
        if (marketBias === 'NEUTRAL') {
          logger.info('Scanner determined NEUTRAL bias - skipping signal generation');
          this.broadcast('Market is NEUTRAL/choppy - no clear direction. Skipping signal generation.', 'warning');
        } else if (scannerResult.candidates && scannerResult.candidates.length > 0) {
          // 2. Analyzer - Pass market bias context with chart images
          logger.info('Running Analyzer Agent...');
          this.broadcast('Deploying Analyzer Agent for deep-dive technical analysis...', 'info');
          
          // Generate multi-timeframe chart images for top candidates (limit to 3 candidates)
          // Each candidate gets 3 timeframes: 4H (higher timeframe), 1H (execution timeframe), 15m (precision entries)
          const topCandidates = scannerResult.candidates.slice(0, 3);
          const timeframes: Array<{ interval: '15m' | '1h' | '4h'; label: string; days: number; maxCandles: number }> = [
            { interval: '4h', label: '4H', days: 30, maxCandles: 100 },    // Fetch 30 days, use last 100 candles
            { interval: '1h', label: '1H', days: 7, maxCandles: 100 },     // Fetch 7 days, use last 100 candles
            { interval: '15m', label: '15m', days: 3, maxCandles: 100 },   // Fetch 3 days, use last 100 candles
          ];
          
          // Store charts grouped by symbol with all timeframes
          const multiTimeframeCharts: Array<{
            symbol: string;
            charts: Array<{ timeframe: string; base64: string; mimeType: string }>;
          }> = [];
          
          for (const candidate of topCandidates) {
            const symbolCharts: Array<{ timeframe: string; base64: string; mimeType: string }> = [];
            
            for (const tf of timeframes) {
              try {
                logger.info(`Generating ${tf.label} chart for ${candidate.symbol}...`);
                const allOhlcv = await binanceService.getOHLCV(candidate.symbol, tf.interval, tf.days);
                if (allOhlcv && allOhlcv.length >= 20) {
                  // Limit to maxCandles for cleaner, more readable charts
                  const ohlcv = allOhlcv.slice(-tf.maxCandles);
                  const chartResult = await proChartService.generateCandlestickChart(
                    ohlcv,
                    candidate.symbol,
                    {
                      title: `${candidate.symbol}/USDT - ${tf.label}`,
                      width: 1400,
                      height: 900,
                      showVolume: true,
                      showSMA: [20, 50],
                      showBollingerBands: true,
                      darkMode: true,
                    }
                  );
                  symbolCharts.push({
                    timeframe: tf.label,
                    base64: chartResult.base64,
                    mimeType: chartResult.mimeType,
                  });
                  logger.info(`${tf.label} chart generated for ${candidate.symbol} (${ohlcv.length} candles)`);
                }
              } catch (e) {
                logger.warn(`Failed to generate ${tf.label} chart for ${candidate.symbol}:`, e);
              }
            }
            
            if (symbolCharts.length > 0) {
              multiTimeframeCharts.push({
                symbol: candidate.symbol,
                charts: symbolCharts,
              });
            }
          }
          
          const { runner: analyzer } = await AnalyzerAgent.build();
          
          // If we have multi-timeframe chart images, use vision API for comprehensive analysis
          let chartAnalysisText = '';
          if (multiTimeframeCharts.length > 0) {
            const totalCharts = multiTimeframeCharts.reduce((sum, m) => sum + m.charts.length, 0);
            logger.info(`Performing multi-timeframe visual analysis for ${multiTimeframeCharts.length} coin(s), ${totalCharts} total chart(s)...`);
            this.broadcast(`Analyzing ${totalCharts} multi-timeframe charts with vision model (4H/1H/15m)...`, 'info');
            
            try {
              // Build vision messages - analyze all timeframes together per symbol for coherent MTF analysis
              const visionAnalyses: string[] = [];
              
              for (const symbolData of multiTimeframeCharts) {
                const timeframeLabels = symbolData.charts.map(c => c.timeframe).join(', ');
                logger.info(`Analyzing ${symbolData.symbol} across ${timeframeLabels}...`);
                
                const visionPrompt = `You are an ELITE multi-timeframe crypto technical analyst. You are viewing ${symbolData.charts.length} charts for ${symbolData.symbol}/USDT across different timeframes (${timeframeLabels}).

**YOUR TASK:** Provide a COMPREHENSIVE multi-timeframe analysis with EXACT PRICE LEVELS for automated trading.

═══════════════════════════════════════════════════════════════════════════════
📊 MULTI-TIMEFRAME STRUCTURE ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

**4H TIMEFRAME (Higher Timeframe - Trend Direction):**
• Overall Trend: [STRONG BULLISH / BULLISH / NEUTRAL / BEARISH / STRONG BEARISH]
• Market Structure: [Higher highs & higher lows / Lower highs & lower lows / Ranging]
• Key Swing Points: 
  - Last Swing High: $[exact price]
  - Last Swing Low: $[exact price]
• Major Support: $[price] - [reason]
• Major Resistance: $[price] - [reason]
• SMA/EMA Position: [Price above/below 20 & 50 SMA - bullish/bearish]
• Bollinger Band Position: [Upper/Middle/Lower band - implication]

**1H TIMEFRAME (Execution Timeframe - Entry Zones):**
• Trend Alignment with 4H: [ALIGNED / DIVERGENT / TRANSITIONING]
• Current Price Action: [describe recent 24-48h movement]
• Immediate Support: $[price] - [structural reason]
• Immediate Resistance: $[price] - [structural reason]
• Order Blocks/Fair Value Gaps: [identify any, with prices]
• Volume Profile: [increasing/decreasing on moves]

**15M TIMEFRAME (Precision - Exact Entries):**
• Short-term Momentum: [BULLISH / BEARISH / CONSOLIDATING]
• Micro Structure: [describe last few hours of price action]
• Precision Entry Zone: $[price] to $[price]
• Immediate Invalidation: $[price]
• Scalp Support: $[price]
• Scalp Resistance: $[price]

═══════════════════════════════════════════════════════════════════════════════
🎯 CONSOLIDATED PRICE LEVELS (ALL TIMEFRAMES)
═══════════════════════════════════════════════════════════════════════════════

🟢 **SUPPORT LEVELS** (ranked by strength):
• S1 (15m): $[price] - [reason] - [timeframe origin]
• S2 (1H): $[price] - [reason] - [timeframe origin]
• S3 (4H): $[price] - [reason] - [timeframe origin]
• S4 (Major): $[price] - [reason] - [confluence of timeframes]

🔴 **RESISTANCE LEVELS** (ranked by strength):
• R1 (15m): $[price] - [reason] - [timeframe origin]
• R2 (1H): $[price] - [reason] - [timeframe origin]
• R3 (4H): $[price] - [reason] - [timeframe origin]
• R4 (Major): $[price] - [reason] - [confluence of timeframes]

═══════════════════════════════════════════════════════════════════════════════
📐 CHART PATTERNS & CONFLUENCES
═══════════════════════════════════════════════════════════════════════════════

• 4H Patterns: [flags, triangles, H&S, wedges, channels - with target prices]
• 1H Patterns: [any patterns forming - with breakout levels]
• 15m Patterns: [micro patterns for entry timing]
• Multi-TF Confluence Zones: [where multiple timeframes agree on S/R]

═══════════════════════════════════════════════════════════════════════════════
⚡ TRADE RECOMMENDATION
═══════════════════════════════════════════════════════════════════════════════

**⚠️ ORDER TYPE RESTRICTION:** We can ONLY place MARKET orders or LIMIT orders.
- MARKET ORDER: Enter immediately at current price (for breakouts, momentum plays)
- LIMIT ORDER: Set a limit buy/sell at a specific price BELOW current price for LONG, ABOVE for SHORT
- ❌ NO BUY STOP / SELL STOP orders (cannot enter on breakout above/below current price)
- If your strategy requires entering on a breakout ABOVE current price (buy stop) → recommend MARKET order when price reaches that level OR skip the trade

• **Direction**: [LONG / SHORT / NO TRADE]
• **Confidence**: [HIGH / MEDIUM / LOW] - [reason based on TF alignment]
• **Order Type**: [MARKET / LIMIT] - remember: NO buy stop or sell stop orders allowed
• **Entry Strategy**: [market now / limit at $X below current for LONG, above current for SHORT]
• **Optimal Entry Zone**: $[price] to $[price]
• **Stop Loss**: $[exact price] - ⚠️ MUST BE >= 3% FROM ENTRY (minimum 3% stop distance required)
  - For LONG: stop must be at least 3% BELOW entry price
  - For SHORT: stop must be at least 3% ABOVE entry price
  - Example: If entry is $100, LONG stop must be $97 or lower, SHORT stop must be $103 or higher
• **Take Profit 1**: $[price] - [reason - e.g., "1H resistance"]
• **Take Profit 2**: $[price] - [reason - e.g., "4H swing high"]
• **Take Profit 3**: $[price] - [reason - e.g., "major resistance zone"]
• **Risk:Reward**: [ratio]
• **Timeframe Alignment Score**: [3/3 aligned, 2/3 aligned, conflicting]

**CRITICAL PRICE EXTRACTION INSTRUCTIONS:**
1. Read the Y-axis price labels carefully - they show exact price levels
2. All prices must be EXACT numbers read from the charts - these will be used for automated order placement
3. Do NOT estimate or use ranges like "around $X" - use EXACT prices from the chart scale
4. The charts display multiple price levels on the right side - use these for precision
5. ⚠️ STOP-LOSS MUST BE >= 3% FROM ENTRY - verify your calculation before suggesting`;
                
                // Create multi-image message with all timeframes for this symbol
                const images = symbolData.charts.map(c => ({ base64: c.base64, mimeType: c.mimeType }));
                const visionMessage = createMultiImageVisionMessage(visionPrompt, images);
                const visionResponse = await callVisionLLM([visionMessage], { maxTokens: 110000 });
                visionAnalyses.push(`**${symbolData.symbol} Multi-Timeframe Analysis (${timeframeLabels}):**\n${visionResponse}`);
                logger.info(`Multi-timeframe vision analysis complete for ${symbolData.symbol}`);
              }
              
              chartAnalysisText = `\n\n📊 MULTI-TIMEFRAME VISUAL CHART ANALYSIS (4H/1H/15m from vision model):\n${visionAnalyses.join('\n\n' + '═'.repeat(80) + '\n\n')}`;
              logger.info('All multi-timeframe chart analyses complete');
            } catch (e) {
              logger.warn('Multi-timeframe vision analysis failed, proceeding without chart images:', e);
              chartAnalysisText = '\n\n⚠️ Multi-timeframe chart image analysis unavailable - proceeding with numerical data only.';
            }
          }
          
          const analyzerPromptText = `Analyze these ${marketBias} candidates for high-probability trading signals:

Market Bias: ${marketBias}
Bias Reasoning: ${biasReasoning}

Candidates: ${JSON.stringify(scannerResult.candidates)}
          
Global Market Context: ${JSON.stringify(marketData.global_market_context)}

IMPORTANT: Direction MUST match market bias (${marketBias}). All candidates should be ${marketBias} setups.${chartAnalysisText}`;
          
          // Use standard text-based agent call with the visual analysis embedded
          analyzerResult = await this.runAgentWithRetry<AnalyzerResult>(
            analyzer,
            analyzerPromptText,
            'Analyzer Agent'
          );
          logger.info('Analyzer result:', analyzerResult);

          if (analyzerResult.action === 'signal' && analyzerResult.selected_token && analyzerResult.signal_details) {
            // ═══════════════════════════════════════════════════════════════════
            // PRICE VALIDATION - Catch hallucinated prices before executing trades
            // ═══════════════════════════════════════════════════════════════════
            const symbol = analyzerResult.selected_token.symbol;
            const entryPrice = analyzerResult.signal_details.entry_price;
            const orderType = analyzerResult.signal_details.order_type || 'market';
            
            if (symbol && entryPrice) {
              logger.info(`Validating entry price for ${symbol}: $${entryPrice} (${orderType} order)...`);
              const priceValidation = await validateSignalPrice(symbol, entryPrice, orderType);
              
              if (!priceValidation.valid) {
                logger.error(`❌ PRICE VALIDATION FAILED for ${symbol}:`, priceValidation.error);
                logger.error(`Signal entry: $${entryPrice}, Real price: $${priceValidation.realPrice}, Deviation: ${priceValidation.deviation?.toFixed(1)}%`);
                this.broadcast(`⚠️ Signal rejected: ${symbol} entry price ($${entryPrice}) too far from real price ($${priceValidation.realPrice?.toFixed(4)}). LLM may have hallucinated the price.`, 'warning');
                
                // Don't proceed with hallucinated price signal
                signalGenerated = false;
              } else {
                logger.info(`✅ Price validated for ${symbol}: Entry $${entryPrice}, Real $${priceValidation.realPrice?.toFixed(4)} (${priceValidation.deviation?.toFixed(1)}% deviation)`);
                
                // Update signal with validated real price if available
                if (priceValidation.realPrice && orderType === 'market') {
                  // For market orders, use real price as the entry price
                  analyzerResult.signal_details.current_price = priceValidation.realPrice;
                  analyzerResult.signal_details.entry_price = priceValidation.realPrice;
                  logger.info(`Updated market order entry price to real price: $${priceValidation.realPrice.toFixed(4)}`);
                }
                
                // QUALITY GATE: Programmatic validation to catch signals that slip through
                const qualityCheck = validateSignalQuality(analyzerResult);
                
                if (!qualityCheck.isValid) {
                  logger.warn(`Signal REJECTED by quality gate for ${symbol}:`, qualityCheck.reasons);
                  logger.info('Signal quality metrics:', qualityCheck.metrics);
                  this.broadcast(
                    `Signal for ${symbol} rejected by quality gate: ${qualityCheck.reasons.join(', ')}`,
                    'warning',
                    { analyzerResult, qualityCheck }
                  );
                  // Force no signal
                  signalGenerated = false;
                } else {
                  logger.info(`Signal PASSED quality gate for ${symbol}:`, qualityCheck.metrics);
                  this.broadcast(`High-conviction signal detected for ${symbol}. Confidence: ${analyzerResult.signal_details.confidence}% | R:R: 1:${qualityCheck.metrics.riskRewardRatio.toFixed(1)} | Stop: ${qualityCheck.metrics.stopLossPercent.toFixed(1)}%`, 'success', analyzerResult);
                  signalGenerated = true;
                }
              }
            } else {
              logger.warn(`Cannot validate price: missing symbol (${symbol}) or entry price (${entryPrice})`);
              signalGenerated = false;
            }
          } else {
            this.broadcast('Analyzer Agent filtered out candidates. No high-conviction signal found.', 'warning');
            logger.info('Analyzer decided to skip signal generation.');
          }
        } else {
          this.broadcast('No significant anomalies found by Scanner Agent.', 'warning');
          logger.info('No candidates found by Scanner.');
        }
      }

      if (signalGenerated && analyzerResult && analyzerResult.signal_details) {
        const isLimitOrder = analyzerResult.signal_details.order_type === 'limit';
        
        if (isLimitOrder) {
            // Validate required fields for pending signals
            // Symbol is required - coingecko_id will be resolved from mapping
            if (!analyzerResult.selected_token?.symbol) {
                logger.error('Cannot create pending signal: missing symbol for price monitoring');
                return;
            }
            if (!analyzerResult.signal_details.entry_price) {
                logger.error('Cannot create pending signal: missing entry_price');
                return;
            }
            
            logger.info(`Limit Order detected for ${analyzerResult.selected_token?.symbol}. Processing as PENDING signal.`);
        }

        // 3. Generator (Signal)
        logger.info('Running Generator Agent (Signal)...');
        const { runner: generator } = await GeneratorAgent.build();
        const generatorPrompt = `Generate content for this signal: ${JSON.stringify({
          token: analyzerResult.selected_token,
          details: analyzerResult.signal_details
        })}`;

        const generatorResult = await this.runAgentWithRetry<GeneratorResult>(
          generator,
          generatorPrompt,
          'Generator Agent (Signal)'
        );
        logger.info('Generator result:', generatorResult);
        this.broadcast('Content generated successfully.', 'success', generatorResult);

        // Clean the content and format for proper tweet display
        const rawContent = generatorResult.formatted_content || generatorResult.tweet_text;
        const content = rawContent ? formatSignalTweet(rawContent) : null;

        if (!content) {
            logger.error('Generator failed to produce content', generatorResult);
            await this.saveRun(
                runId,
                'signal',
                { error: 'Generator failed to produce content', generatorResult },
                startTime,
                analyzerResult.signal_details.confidence,
                'Generator failed to produce content'
            );
            return;
        }

        // 4. Publisher (Tiered)
        // Ensure coingecko_id is set correctly using our mapping
        const tokenWithCorrectId = {
          ...analyzerResult.selected_token,
          coingecko_id: analyzerResult.selected_token?.symbol 
            ? getCoingeckoId(analyzerResult.selected_token.symbol)
            : analyzerResult.selected_token?.coingecko_id,
        };
        const signalContent = {
          token: tokenWithCorrectId,
          ...analyzerResult.signal_details,
          formatted_tweet: content,
          log_message: generatorResult.log_message,
          status: isLimitOrder ? 'pending' : 'active',
        };

        // Save run first to ensure ID exists for scheduled posts
        await this.saveRun(
          runId, 
          'signal', 
          signalContent, 
          startTime, 
          analyzerResult.signal_details.confidence,
          undefined,
          null, // publicPostedAt is now delayed
          new Date().toISOString() // telegramDeliveredAt (immediate for Gold/Diamond)
        );

        // Immediate: Gold/Diamond
        logger.info(`Distributing Signal to GOLD/DIAMOND for run ${runId}...`);
        telegramService.broadcastToTiers(content, [TIERS.GOLD, TIERS.DIAMOND])
          .catch(err => logger.error('Error broadcasting to GOLD/DIAMOND', err));

        // Process signal for Diamond Futures Agents (automated trading)
        // Limit orders are placed immediately on Hyperliquid and sit on the order book until filled
        // The "pending" status just tracks whether the limit order has filled yet
        if (signalContent.token?.symbol && signalContent.entry_price && signalContent.stop_loss && signalContent.target_price) {
          logger.info(`Processing signal for Diamond Futures Agents (${signalContent.order_type || 'market'} order)...`);
          const direction: 'LONG' | 'SHORT' = signalContent.target_price > signalContent.entry_price ? 'LONG' : 'SHORT';
          const triggerType: 'long_setup' | 'short_setup' = direction === 'LONG' ? 'long_setup' : 'short_setup';
          
          signalExecutorService.processSignal({
            signalId: runId,
            signal: {
              token: {
                symbol: signalContent.token.symbol,
                name: signalContent.token.name || signalContent.token.symbol,
                contract_address: (signalContent.token as any).address || (signalContent.token as any).contract_address || '',
              },
              direction,
              entry_price: signalContent.entry_price,
              target_price: signalContent.target_price,
              stop_loss: signalContent.stop_loss,
              confidence: signalContent.confidence || 50,
              trigger_event: signalContent.trigger_event ? {
                type: signalContent.trigger_event.type as any,
                description: signalContent.trigger_event.description,
              } : { type: triggerType, description: 'Signal from swarm' },
              analysis: signalContent.analysis || '',
              formatted_tweet: signalContent.formatted_tweet || '',
              order_type: signalContent.order_type || 'market',
              status: (signalContent.status as 'active' | 'pending' | 'tp_hit' | 'sl_hit' | 'closed') || 'active',
            },
          }).then(result => {
            if (result.executed > 0) {
              logger.info(`Futures: ${result.executed}/${result.processed} agents executed trades for signal ${runId}`);
            } else if (result.processed > 0) {
              // Log why trades failed
              const errors = result.results.filter(r => !r.success && r.error);
              if (errors.length > 0) {
                logger.warn(`Futures: ${result.processed} agents processed but no trades executed. Errors: ${errors.map(e => `${e.agentName}: ${e.error}`).join('; ')}`);
              }
            }
          }).catch(err => logger.error('Error processing signal for futures agents', err));
        } else {
          logger.info(`Signal ${runId} missing required fields for futures trading, skipping`);
        }

        // Delayed 15m: Silver (DB-backed)
        logger.info(`Scheduling Signal for SILVER (+15-20m) for run ${runId}...`);
        await scheduledPostService.schedulePost(runId, 'SILVER', content)
          .catch(err => logger.error('Error scheduling SILVER post', err));

        // Delayed 30m: Public (Twitter, DB-backed)
        logger.info(`Scheduling Signal for PUBLIC (+30m) for run ${runId}...`);
        await scheduledPostService.schedulePost(runId, 'PUBLIC', content)
          .catch(err => logger.error('Error scheduling PUBLIC post', err));

      } else {
        // Fallback to Intel
        logger.info('Running Intel Flow...');
        this.broadcast('Running Intel Flow...', 'info');
        
        // Fetch recent topics to avoid repetition
        const recentTopics = await supabaseService.getRecentIntelTopics(5);
        logger.info('Recent Intel Topics:', recentTopics);
        
        // Check if we should generate exclusive Deep Dive (only once per Sunday)
        const isSunday = new Date().getDay() === 0;
        const hasDeepDiveToday = isSunday ? await supabaseService.hasDeepDiveToday() : false;
        const shouldGenerateDeepDive = isSunday && !hasDeepDiveToday;
        
        // 1. Intel Agent
        const { runner: intelAgent } = await IntelAgent.build();
        let intelPrompt = shouldGenerateDeepDive
          ? `🔥 PREMIUM DEEP DIVE MODE 🔥

This is an EXCLUSIVE Sunday Deep Dive for Gold/Diamond tier users only. This is NOT a regular intel report.

Your task: Synthesize the ENTIRE WEEK's market movements into a comprehensive strategic analysis.

CURRENT MARKET DATA:
${JSON.stringify(marketData, null, 2)}

THIS WEEK'S COVERAGE (Use these as foundation - synthesize and expand):
${JSON.stringify(recentPosts)}

TOPICS ALREADY COVERED THIS WEEK (Build upon these):
${recentTopics.join(', ')}

Your task: Connect the dots between all these topics. How do they relate? What's the bigger picture?`
          : `Analyze this market data and generate an intel report: ${JSON.stringify(marketData, null, 2)}
        
        RECENTLY POSTED CONTENT (Avoid repeating these):
        ${JSON.stringify(recentPosts)}
        
        AVOID these recently covered topics: ${recentTopics.join(', ')}`;

        if (shouldGenerateDeepDive) {
            intelPrompt += `

Focus on:
1. **Cross-Narrative Connections**: How did different sectors (DeFi, AI, Privacy, Gaming, etc.) interact this week? What capital rotations occurred?
2. **Mindshare vs. Price Divergences**: Which narratives gained social traction but price lagged (or vice versa)? Why?
3. **KOL Influence Analysis**: Which influencer narratives actually moved markets? What did they get right/wrong?
4. **Hidden Alpha**: What non-obvious patterns emerged that most traders missed?
5. **Week-Ahead Positioning**: Based on this week's data, what are the 2-3 highest-conviction plays for next week?
6. **Macro Context**: How did broader market conditions (ETF flows, regulatory news, tech sector moves) impact crypto?
7. **On-Chain Evidence**: What do TVL flows, whale movements, and protocol metrics actually tell us?

IMPORTANCE SCORE: Set to 10 automatically for Deep Dives.
TOPIC: Should be a bold, specific thesis (e.g., "The Silent Rotation: How Privacy Coins Became the Week's Contrarian Play")
INSIGHT: 3-5 paragraphs of genuine strategic analysis with specific numbers, dates, and actionable takeaways.`;
        }
        
        const intelResult = await this.runAgentWithRetry<IntelResult>(
          intelAgent,
          intelPrompt,
          'Intel Agent'
        );
        logger.info('Intel result:', intelResult);
        this.broadcast(`Intel Agent generated report: ${intelResult.topic}`, 'success', intelResult);

        if (intelResult.topic === 'SKIP' || intelResult.importance_score < 7) {
            logger.info('Intel Agent decided to SKIP (Low importance or no new topics).');
            this.broadcast('Intel Agent decided to SKIP (Low importance or no new topics).', 'warning');
            await this.saveRun(
                runId,
                'intel',
                { topic: 'SKIPPED', insight: 'Low importance' },
                startTime,
                0,
                undefined,
                null,
                null
            );
            return;
        }

        // 2. Generator (Intel)
        logger.info('Running Generator Agent (Intel)...');
        this.broadcast('Running Generator Agent (Intel)...', 'info');
        const { runner: generator } = await GeneratorAgent.build();
        const generatorPrompt = shouldGenerateDeepDive 
          ? `Generate content for this PREMIUM DEEP DIVE REPORT.
        
        This is exclusive Sunday content for Gold/Diamond users. Make it EXCEPTIONAL.
        
        Requirements:
        - tweet_text: NOT USED for deep dives (set to empty string or brief teaser)
        - blog_post: A comprehensive 1500-2000 word Markdown article with:
          * Executive Summary (3-4 bullet points of key findings)
          * Multiple sections with H2/H3 headers
          * Data-backed arguments (include specific percentages, dates, prices)
          * Visual hierarchy (use bold, italics, blockquotes for emphasis)
          * Actionable insights (specific entry points, risk levels, timeframes)
          * Forward-looking thesis for next week
        - image_prompt: PREMIUM COVER IMAGE - Create a sophisticated, editorial-style prompt:
          * Think: Financial Times, Bloomberg Markets, or premium research report covers
          * Avoid: Crypto clichés (coins, charts, generic blockchain visuals)
          * Use: Cinematic lighting, architectural elements, abstract financial concepts, luxury aesthetic
          * Examples: "Minimalist marble trading floor bathed in golden hour light, abstract market data streams flowing through brutalist architecture, hyperrealistic 8k, premium editorial photography" or "Luxury penthouse office at night overlooking cityscape, holographic financial data projections, warm amber lighting, architectural digest style, ultra-detailed"
          * Make it look like a $10,000 stock photo, not AI crypto art
        
        Report: ${JSON.stringify(intelResult)}
        
        Make this feel like a $500/month newsletter, not a free blog post.`
          : `Generate content for this INTEL REPORT.
        
        I need both a 'tweet_text' (short, lowercase, alpha vibe) and a 'blog_post' (full markdown analysis).
        
        Report: ${JSON.stringify(intelResult)}`;
        
        const generatorResult = await this.runAgentWithRetry<GeneratorResult>(
          generator,
          generatorPrompt,
          'Generator Agent (Intel)'
        );
        logger.info('Generator result:', generatorResult);
        this.broadcast('Generator Agent produced content.', 'success', generatorResult);

        // 2.1 Writer Agent (Long Form)
        logger.info('Running Writer Agent (Intel)...');
        this.broadcast('Running Writer Agent (Intel)...', 'info');
        const { runner: writer } = await WriterAgent.build();
        const writerPrompt = shouldGenerateDeepDive
          ? `Write an ELITE-TIER investigative article for this PREMIUM DEEP DIVE.
        
        This is exclusive Sunday content worth $100+ in value. Treat it like a Bloomberg/The Block premium piece.
        
        Structure:
        1. **Headline**: Punchy, thesis-driven (10-15 words max)
        2. **Lead Paragraph**: Hook readers with the single most important finding
        3. **Context Section**: What happened this week that matters (300-400 words)
        4. **Deep Analysis**: Multi-angle investigation with sub-sections (800-1000 words):
           - On-chain data interpretation
           - Social sentiment analysis
           - Cross-market correlations
           - Hidden patterns/contrarian takes
        5. **Strategic Implications**: What this means for traders (200-300 words)
        6. **Week Ahead**: Specific plays, price levels, catalysts to watch (200-300 words)
        7. **TLDR**: 3-sentence executive summary for busy traders
        
        Writing Style:
        - Authoritative but accessible
        - Use specific data points ("BTC fell 12.3% to $85,432" not "BTC dropped")
        - Include direct quotes or paraphrases from KOL analysis
        - Call out consensus views then challenge them
        - End sections with clear takeaways
        
        Report Data: ${JSON.stringify(intelResult)}
        
        This should be indistinguishable from premium paid research.`
          : `Write a deep-dive article for this INTEL REPORT.
        Report: ${JSON.stringify(intelResult)}`;
        
        const writerResult = await this.runAgentWithRetry<WriterResult>(
            writer,
            writerPrompt,
            'Writer Agent (Intel)'
        );
        logger.info('Writer result:', writerResult);
        this.broadcast('Writer Agent completed deep-dive article.', 'success', writerResult);

        // 2.5 Image Generation
        let imageUrl: string | null = null;
        if (generatorResult.image_prompt) {
          logger.info('Generating image for intel...');
          this.broadcast('Generating image for intel...', 'info');
          imageUrl = await zImageService.generateImage(generatorResult.image_prompt);
          this.broadcast('Image generated successfully.', 'success', { imageUrl });
        }

        // 3. Publisher (Tiered)
        logger.info(`Publishing Intel for run ${runId}...`);
        this.broadcast(`Publishing Intel for run ${runId}...`, 'info');
        // Clean and format intel tweet content for readability
        const rawTweetContent = generatorResult.tweet_text || generatorResult.formatted_content;
        const tweetContent = rawTweetContent ? formatIntelTweet(rawTweetContent) : null;
        const blogContent = generatorResult.blog_post || generatorResult.formatted_content;
        
        // Save run first to ensure ID exists for scheduled posts
        await this.saveRun(
          runId, 
          shouldGenerateDeepDive ? 'deep_dive' : 'intel', 
          { 
            ...intelResult, 
            tweet_text: tweetContent,
            blog_post: generatorResult.blog_post,
            long_form_content: writerResult.content,
            headline: writerResult.headline,
            tldr: writerResult.tldr,
            image_prompt: generatorResult.image_prompt,
            image_url: imageUrl,
            formatted_tweet: tweetContent, // Keep for backward compat
            log_message: generatorResult.log_message,
            is_deep_dive: shouldGenerateDeepDive,
          }, 
          startTime, 
          null,
          undefined,
          shouldGenerateDeepDive ? null : undefined, // Don't post deep dives publicly
          new Date().toISOString() // telegramDeliveredAt (immediate for Gold/Diamond)
        );

        // Immediate: Gold/Diamond (Blog Post)
        if (blogContent) {
           const prefix = shouldGenerateDeepDive ? '📊 EXCLUSIVE DEEP DIVE 📊\n\n' : '';
           logger.info(`Distributing ${shouldGenerateDeepDive ? 'Deep Dive' : 'Intel'} to GOLD/DIAMOND for run ${runId}...`);
           const intelLink = `https://rogue-adk.vercel.app/app/intel/${runId}`;
           // Use TLDR for Telegram, full content is on the website
           const tldrText = writerResult.tldr || intelResult.insight || 'New intel available';
           const messageWithLink = `${prefix}${writerResult.headline}\n\n${tldrText}\n\n[View full ${shouldGenerateDeepDive ? 'deep dive' : 'intel'} here](${intelLink})`;
           telegramService.broadcastToTiers(messageWithLink, [TIERS.GOLD, TIERS.DIAMOND])
             .catch(err => logger.error('Error distributing to GOLD/DIAMOND', err));
        }

        // Delayed 15-20m: Silver (Blog Post) - SKIP if it's an exclusive Deep Dive
        if (blogContent && !shouldGenerateDeepDive) {
           logger.info(`Scheduling Intel Blog for SILVER (+15-20m) for run ${runId}...`);
           await scheduledPostService.schedulePost(runId, 'SILVER', blogContent)
             .catch(err => logger.error('Error scheduling SILVER intel post', err));
        }

        // Delayed 30m: Public (Twitter) - SKIP if it's an exclusive Deep Dive
        if (tweetContent && !shouldGenerateDeepDive) {
           logger.info(`Scheduling Intel Tweet for PUBLIC (+30m) for run ${runId}...`);
           await scheduledPostService.schedulePost(runId, 'PUBLIC', tweetContent)
             .catch(err => logger.error('Error scheduling PUBLIC intel post', err));
        } else if (shouldGenerateDeepDive) {
           logger.info(`Deep Dive is exclusive - skipping public distribution for run ${runId}`);
        }
      }
      
      logger.info('Run completed successfully.');
      this.broadcast('Run completed successfully.', 'success');

    } catch (error: any) {
      logger.error('Swarm run failed:', error);
      this.broadcast(`Swarm run failed: ${error.message}`, 'error');
      await this.saveRun(runId, 'skip', { error: error.message }, startTime, null, error.message);
    }
  }

  async processCustomRequest(requestId: string, tokenSymbol: string, walletAddress: string) {
    logger.info(`Processing custom request ${requestId} for ${tokenSymbol}`);
    
    try {
      // Update status to processing
      await supabaseService.updateCustomRequest(requestId, { status: 'processing' });

      // 1. Scanner (Targeted)
      logger.info('Running Scanner Agent for custom request...');
      const { runner: scanner } = await ScannerAgent.build();
      const scannerResult = await this.runAgentWithRetry<ScannerResult>(
        scanner,
        `Perform a deep-dive scan on ${tokenSymbol}. I need:
        1. Current Price, Market Cap, and 24h Volume.
        2. Recent price action (1h, 24h, 7d).
        3. Top 3 recent news headlines or social narratives driving the price.
        4. Any on-chain anomalies (whale movements, TVL changes) if available.
        Focus on finding the 'why' behind the current price action.`,
        'Scanner Agent'
      );
      
      // 2. Analyzer
      logger.info('Running Analyzer Agent for custom request...');
      const { runner: analyzer } = await AnalyzerAgent.build();
      const analyzerResult = await this.runAgentWithRetry<AnalyzerResult>(
        analyzer,
        `Analyze this data for a high-stakes trader.
        Data: ${JSON.stringify(scannerResult)}

        I need a 'Custom Alpha Report' that answers:
        1. Is this token currently overbought or oversold?
        2. What is the primary narrative driving it right now?
        3. What are the key support/resistance levels to watch?
        4. VERDICT: Bullish, Bearish, or Neutral? Give a confidence score (0-100%).
        
        IMPORTANT: You must fit this analysis into the strict output schema.
        - Put the detailed answers to the above questions into the 'analysis' string field.
        - You MUST provide 'entry_price', 'target_price', 'stop_loss' (use best estimates from support/resistance or null if strictly not applicable).
        - You MUST provide 'confidence' (number 1-100).
        - You MUST provide 'action' ('signal', 'skip', or 'no_signal').`,
        'Analyzer Agent'
      );

      // 3. Generator
      logger.info('Running Generator Agent for custom request...');
      const { runner: generator } = await GeneratorAgent.build();
      const generatorResult = await this.runAgentWithRetry<GeneratorResult>(
        generator,
        `Generate a 'Rogue Agent Custom Report' for ${tokenSymbol} based on this analysis.
        Analysis: ${JSON.stringify(analyzerResult)}

        Format:
        - Use Markdown.
        - Start with a bold header: '🕵️‍♂️ ROGUE CUSTOM SCAN: ${tokenSymbol}'.
        - Include sections: 'Market Snapshot', 'Narrative Check', 'Technical Outlook', and 'The Verdict'.
        - Tone: Professional, sharp, no-nonsense, 'alpha' focused.
        - Keep it under 400 words.
        
        IMPORTANT: Put the entire report in the 'formatted_content' field of the JSON output.`,
        'Generator Agent'
      );

      // 4. Deliver via Telegram DM (if available) and always store result
      const content = generatorResult.formatted_content || generatorResult.blog_post || "Analysis generation failed.";
      
      // Always store the result in the database for web polling
      await supabaseService.updateCustomRequest(requestId, { 
        status: 'completed',
        analysis_result: generatorResult,
        delivered_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

      // Also send to Telegram if user has it linked
      const user = await supabaseService.getUser(walletAddress);
      if (user && user.telegram_user_id) {
        await telegramService.sendMessage(
          `**Custom Analysis for ${tokenSymbol}**\n\n${content}`,
          user.telegram_user_id.toString()
        );
        logger.info(`Custom scan delivered to Telegram for ${walletAddress}`);
      } else {
        logger.info(`Custom scan completed for ${walletAddress} (no Telegram linked - web only)`);
      }

    } catch (error: any) {
      logger.error(`Custom request processing failed for ${requestId}`, error);
      await supabaseService.updateCustomRequest(requestId, { 
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      });
    }
  }

  async runYieldAnalysis() {
    const runId = randomUUID();
    logger.info(`Starting Yield Analysis run ${runId}`);

    try {
      // Step 1: Get all existing yield opportunities from database
      const existingYields = await supabaseService.getAllYieldOpportunities();
      logger.info(`Found ${existingYields.length} existing yield opportunities to verify`);

      // Step 2: Build prompt with existing data for verification
      const prompt = buildYieldPrompt(existingYields as ExistingYield[]);

      // Step 3: Run agent with existing data context
      const { runner } = await YieldAgent.build();
      const result = await runner.ask(prompt) as any;

      // Step 4: Replace ALL data with verified + new opportunities
      if (result.opportunities && Array.isArray(result.opportunities)) {
        logger.info(`Agent returned ${result.opportunities.length} verified yield opportunities. Replacing DB...`);
        await supabaseService.replaceAllYieldOpportunities(result.opportunities);
        logger.info(`Successfully replaced yield opportunities in DB`);
      } else {
        logger.warn('No yield opportunities returned. Clearing old data...');
        await supabaseService.replaceAllYieldOpportunities([]);
      }
    } catch (error) {
      logger.error('Error in Yield Analysis run', error);
    }
  }

  async runAirdropAnalysis() {
    const runId = randomUUID();
    logger.info(`Starting Airdrop Analysis run ${runId}`);

    try {
      // Step 1: Get all existing airdrops from database
      const existingAirdrops = await supabaseService.getAllAirdrops();
      logger.info(`Found ${existingAirdrops.length} existing airdrops to verify`);

      // Step 2: Build prompt with existing data for verification
      const prompt = buildAirdropPrompt(existingAirdrops as ExistingAirdrop[]);

      // Step 3: Run agent with existing data context
      const { runner } = await AirdropAgent.build();
      const result = await runner.ask(prompt) as any;

      // Step 4: Replace ALL data with verified + new airdrops
      if (result.airdrops && Array.isArray(result.airdrops)) {
        logger.info(`Agent returned ${result.airdrops.length} verified airdrops. Replacing DB...`);
        await supabaseService.replaceAllAirdrops(result.airdrops);
        logger.info(`Successfully replaced airdrops in DB`);
      } else {
        logger.warn('No airdrops returned. Clearing old data...');
        await supabaseService.replaceAllAirdrops([]);
      }
    } catch (error) {
      logger.error('Error in Airdrop Analysis run', error);
    }
  }

  private async saveRun(
    id: string, 
    type: 'signal' | 'intel' | 'skip' | 'deep_dive', 
    content: any, 
    startTime: number,
    confidence?: number | null,
    errorMessage?: string,
    publicPostedAt?: string | null,
    telegramDeliveredAt?: string | null
  ) {
    const endTime = Date.now();
    
    // Confidence is now 1-100, no scaling needed
    let finalConfidence = confidence;
    if (typeof confidence === 'number') {
        finalConfidence = Math.max(1, Math.min(100, confidence));
    }

    await supabaseService.createRun({
      id,
      type,
      content,
      cycle_started_at: new Date(startTime).toISOString(),
      cycle_completed_at: new Date(endTime).toISOString(),
      execution_time_ms: endTime - startTime,
      confidence_score: finalConfidence,
      error_message: errorMessage,
      public_posted_at: publicPostedAt,
      telegram_delivered_at: telegramDeliveredAt,
    });
  }

  private async runAgentWithRetry<T>(agentRunner: any, prompt: string, agentName: string): Promise<T> {
    let attempts = 0;
    const maxAttempts = 10;
    let lastError: any;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        let currentPrompt = prompt;
        
        if (attempts > 1) {
          // Add error context to help the agent fix the issue
          const errorMessage = lastError?.message || 'Unknown error';
          const isSchemaError = errorMessage.includes('schema') || errorMessage.includes('validation') || errorMessage.includes('parse') || errorMessage.includes('Tweet text must be under 280 characters');
          
          if (isSchemaError) {
            currentPrompt = `${prompt}

⚠️ PREVIOUS ATTEMPT ${attempts - 1} FAILED DUE TO SCHEMA VALIDATION ERROR ⚠️

Error: ${errorMessage}

CRITICAL INSTRUCTIONS TO FIX:
1. You MUST return valid JSON that exactly matches the output schema
2. ALL required fields must be present (especially 'action' field)
3. Field types must match exactly (strings as strings, numbers as numbers, etc.)
4. Enum values must be exactly as specified (e.g., 'signal', 'skip', or 'no_signal')
5. Do NOT include any conversational text - ONLY the JSON object
6. Double-check your JSON syntax is valid
7. IF THE ERROR WAS ABOUT TWEET LENGTH: You MUST shorten the 'tweet_text' to be under 280 characters. This is a HARD requirement.

Please retry with correctly formatted output.`;
          } else {
            currentPrompt = `${prompt}

PREVIOUS ATTEMPT FAILED. Error: ${errorMessage}
Please try again and ensure all requirements are met.`;
          }
          
          logger.info(`${agentName} retry attempt ${attempts}/${maxAttempts} with enhanced prompt`);
        }
          
        const result = await agentRunner.ask(currentPrompt) as T;
        
        if (attempts > 1) {
          logger.info(`${agentName} succeeded on attempt ${attempts}/${maxAttempts}`);
        }
        
        return result;
      } catch (error: any) {
        logger.warn(`${agentName} attempt ${attempts}/${maxAttempts} failed:`, {
          message: error.message,
          error: error.toString()
        });
        lastError = error;
        
        if (attempts >= maxAttempts) {
          logger.error(`${agentName} failed after ${maxAttempts} attempts. Last error:`, error);
          throw new Error(`${agentName} failed after ${maxAttempts} retries: ${error.message}`);
        }
        
        // Wait a bit before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        logger.info(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw new Error(`${agentName} failed to produce a result after retries.`);
  }
}

export const orchestrator = new Orchestrator();