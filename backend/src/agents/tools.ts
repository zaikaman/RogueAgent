import { createTool } from '@iqai/adk';
const z = require('@iqai/adk/node_modules/zod');
import { coingeckoService } from '../services/coingecko.service';
import { coinMarketCapService } from '../services/coinmarketcap.service';
import { supabaseService } from '../services/supabase.service';
import { twitterService } from '../services/twitter.service';
import { telegramService } from '../services/telegram.service';
import { tavilyService } from '../services/tavily.service';
import { birdeyeService } from '../services/birdeye.service';
import { defillamaService } from '../services/defillama.service';
import { binanceService } from '../services/binance.service';
import { chartImageService } from '../services/chart-image.service';
import { TechnicalAnalysis } from '../utils/ta.util';
import { logger } from '../utils/logger.util';
import { getCoingeckoId, hasCoingeckoMapping } from '../constants/coingecko-ids.constant';

/**
 * Tool to get the correct CoinGecko ID for a token symbol.
 * This is critical for price lookups and technical analysis.
 */
export const getCoingeckoIdTool = createTool({
  name: 'get_coingecko_id',
  description: 'Get the correct CoinGecko API ID for a token symbol. ALWAYS use this before calling get_token_price, get_market_chart, or get_technical_analysis to ensure you have the correct ID. Examples: FET -> "fetch-ai", SOL -> "solana", ARB -> "arbitrum"',
  schema: z.object({
    symbol: z.string().describe('The token symbol (e.g. "FET", "SOL", "ARB", "BTC")'),
  }) as any,
  fn: async ({ symbol }: { symbol: string }) => {
    const coingeckoId = getCoingeckoId(symbol);
    const hasMapping = hasCoingeckoMapping(symbol);
    return {
      symbol: symbol.toUpperCase(),
      coingecko_id: coingeckoId,
      is_verified_mapping: hasMapping,
      usage_hint: `Use "${coingeckoId}" as the tokenId parameter for price/chart tools`,
    };
  },
});

export const getTrendingCoinsTool = createTool({
  name: 'get_trending_coins',
  description: 'Get top trending coins from CoinGecko and Birdeye across multiple chains (Solana, Ethereum, Base, Arbitrum, Avalanche, BSC, Optimism, Polygon, zkSync, Sui, Aptos)',
  fn: async () => {
    const cgCoins = await coingeckoService.getTrending();
    
    const chains = ['solana', 'ethereum', 'base', 'arbitrum'];
    const bePromises = chains.map(chain => 
      birdeyeService.getTrendingTokens(3, chain)
        .then(tokens => tokens.map(t => ({ ...t, chain })))
        .catch(() => [])
    );
    const beResults = await Promise.all(bePromises);
    const beCoins = beResults.flat();

    const mappedCg = cgCoins.map((c: any) => ({
      source: 'coingecko',
      id: c.item.id,
      name: c.item.name,
      symbol: c.item.symbol,
      market_cap_rank: c.item.market_cap_rank,
      price_btc: c.item.price_btc,
    }));

    const mappedBe = beCoins.map((c: any) => ({
      source: 'birdeye',
      chain: c.chain,
      id: c.address, // Birdeye uses address as ID often
      name: c.name,
      symbol: c.symbol,
      rank: c.rank,
      liquidity: c.liquidity,
      volume24h: c.volume24hUSD,
    }));

    return {
      coins: [...mappedCg, ...mappedBe],
    };
  },
});

export const getTopGainersTool = createTool({
  name: 'get_top_gainers',
  description: 'Get top gaining coins (24h) from CoinGecko to find movers',
  fn: async () => {
    const coins = await coingeckoService.getTopGainersLosers();
    return {
      gainers: coins.map((c: any) => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        current_price: c.current_price,
        price_change_percentage_24h: c.price_change_percentage_24h,
        market_cap: c.market_cap,
        total_volume: c.total_volume
      }))
    };
  },
});

export const searchTavilyTool = createTool({
  name: 'search_tavily',
  description: 'Search the web (including X/Twitter) for news and sentiment using Tavily',
  schema: z.object({
    query: z.string().describe('The search query'),
  }) as any,
  fn: async ({ query }) => {
    const result = await tavilyService.searchNews(query);
    return {
      results: result.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score
      })).slice(0, 5)
    };
  },
});

export const getTokenPriceTool = createTool({
  name: 'get_token_price',
  description: 'Get current price of a token in USD using CoinGecko ID OR (Chain + Address).',
  schema: z.object({
    tokenId: z.string().optional().describe('The CoinGecko API ID of the token (e.g. "bitcoin", "solana")'),
    chain: z.string().optional().describe('The blockchain network'),
    address: z.string().optional().describe('The token contract address'),
  }) as any,
  fn: async ({ tokenId, chain, address }) => {
    // 1. PRIORITY: If chain/address provided, use address-based lookup (most accurate)
    if (chain && address) {
      // Try CoinGecko by address first
      const price = await coingeckoService.getPriceByAddress(chain, address);
      if (price) return { chain, address, price, source: 'coingecko_address' };
      
      // Fallback to Birdeye for chain-native tokens
      try {
        const history = await birdeyeService.getPriceHistory(address, chain, 1);
        if (history && history.length > 0) {
           return { chain, address, price: history[history.length - 1].value, source: 'birdeye' };
        }
      } catch (e) {
        // Ignore birdeye error
      }

      // Try to resolve symbol via DexScreener and use CMC as last resort
      try {
        const { dexScreenerService } = require('../services/dexscreener.service');
        const profile = await dexScreenerService.getTokenProfile(address);
        if (profile && profile.symbol) {
           const cmcData = await coinMarketCapService.getPriceWithChange(profile.symbol);
           if (cmcData) {
             return { chain, address, price: cmcData.price, change_24h: cmcData.change_24h, source: 'coinmarketcap', symbol: profile.symbol };
           }
        }
      } catch (e) {
        // Ignore
      }
    }

    // 2. FALLBACK: Try CMC if tokenId is provided (for popular tokens without addresses)
    if (tokenId) {
      // Try as symbol first
      let cmcData = await coinMarketCapService.getPriceWithChange(tokenId);
      if (cmcData) return { tokenId, price: cmcData.price, change_24h: cmcData.change_24h, source: 'coinmarketcap' };
      
      // Try as slug
      cmcData = await coinMarketCapService.getPriceBySlug(tokenId);
      if (cmcData) return { tokenId, price: cmcData.price, change_24h: cmcData.change_24h, source: 'coinmarketcap' };
    }

    // 3. LAST RESORT: CoinGecko by ID
    if (tokenId) {
      const price = await coingeckoService.getPrice(tokenId);
      return { tokenId, price, source: 'coingecko_id' };
    }
    
    return { error: 'No tokenId or (chain + address) provided' };
  },
});

export const getMarketChartTool = createTool({
  name: 'get_market_chart',
  description: 'Get historical market data (prices) for a token. Can use CoinGecko ID or (Chain + Address) for Birdeye.',
  schema: z.object({
    tokenId: z.string().optional().describe('The CoinGecko API ID of the token'),
    chain: z.string().optional().describe('The blockchain network (solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui, aptos)'),
    address: z.string().optional().describe('The token contract address for chain-based lookup'),
    days: z.number().optional().default(7).describe('Number of days of data to fetch (default: 7)'),
  }) as any,
  fn: async ({ tokenId, chain, address, days }) => {
    // 1. Try CMC if tokenId (slug) provided
    if (tokenId) {
        const cmcHistory = await coinMarketCapService.getMarketChart(tokenId, days || 7);
        if (cmcHistory) {
            return {
                prices: cmcHistory.prices,
                summary: `Fetched ${cmcHistory.prices.length} data points for ${tokenId} from CoinMarketCap`
            };
        }
    }

    // Try Birdeye first if chain/address provided
    if (chain && address) {
      try {
        const history = await birdeyeService.getPriceHistory(address, chain, days || 7);
        if (history && history.length > 0) {
          return {
            prices: history.map((h: any) => [h.unixTime * 1000, h.value]),
            summary: `Fetched ${history.length} data points for ${address} on ${chain} over last ${days} days`
          };
        }
      } catch (e) {
        // Fallback to CoinGecko
      }
    }

    // Fallback to CoinGecko
    let targetTokenId: string | undefined = tokenId;
    
    // If we don't have a tokenId but have chain/address, try to resolve it
    if (!targetTokenId && chain && address) {
      const details = await coingeckoService.getCoinDetailsByAddress(chain, address);
      if (details && details.id) {
        targetTokenId = details.id;
      }
    }

    if (targetTokenId) {
      const data = await coingeckoService.getMarketChart(targetTokenId, days || 7);
      if (!data) return { error: 'Failed to fetch market chart data' };
      
      // Simplify data to reduce token usage - just return prices
      // Format: [timestamp, price]
      return { 
        prices: data.prices,
        summary: `Fetched ${data.prices.length} data points for ${targetTokenId} over last ${days} days`
      };
    }
    return { error: "Must provide tokenId OR (chain and address)" };
  },
});

export const checkRecentSignalsTool = createTool({
  name: 'check_recent_signals',
  description: 'Check if a token has an ACTIVE signal in the last 7 days (returns false if previous signals are closed/ended)',
  schema: z.object({
    symbol: z.string(),
  }) as any,
  fn: async ({ symbol }) => {
    const hasRecent = await supabaseService.hasRecentSignal(symbol, 7);
    return { has_recent_signal: hasRecent, last_signal_date: hasRecent ? 'recent' : null };
  },
});

export const postTweetTool = createTool({
  name: 'post_tweet',
  description: 'Post a tweet to Twitter',
  schema: z.object({
    text: z.string().describe('The content of the tweet'),
  }) as any,
  fn: async ({ text }) => {
    const tweetId = await twitterService.postTweet(text);
    return { success: !!tweetId, tweetId };
  },
});

export const sendTelegramTool = createTool({
  name: 'send_telegram',
  description: 'Send a message to the Telegram channel',
  schema: z.object({
    message: z.string().describe('The message content to send (Markdown supported)'),
    channelId: z.string().optional().describe('Optional channel ID, defaults to configured channel'),
  }) as any,
  fn: async ({ message, channelId }) => {
    const success = await telegramService.sendMessage(message, channelId);
    return { success };
  },
});

export const getTechnicalAnalysisTool = createTool({
  name: 'get_technical_analysis',
  description: 'Advanced technical analysis with 2025 meta indicators: CVD, ICT Order Blocks, Volume Profile, Heikin-Ashi, SuperTrend, BB Squeeze, Fibonacci, VW-MACD, and MTF alignment. Works multi-chain.',
  schema: z.object({
    tokenId: z.string().optional().describe('The CoinGecko API ID of the token'),
    symbol: z.string().optional().describe('The token symbol (e.g., BTC, ETH, SOL) - used to fetch real OHLCV from Binance'),
    chain: z.string().optional().describe('The blockchain network (solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui, aptos)'),
    address: z.string().optional().describe('The token contract address for chain-based lookup'),
    days: z.number().optional().default(30).describe('Days of history to analyze (default: 30)'),
  }) as any,
  fn: async ({ tokenId, symbol, chain, address, days }: { tokenId?: string; symbol?: string; chain?: string; address?: string; days?: number }) => {
    let prices: number[] = [];
    let ohlcv: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> = [];
    let dataSource = 'unknown';

    // Extract symbol from tokenId if not provided
    // tokenId for CoinGecko is like "bitcoin", "ethereum" - need to map to symbol
    const tokenSymbol: string | null = symbol || (tokenId ? tokenId.toUpperCase() : null);

    // PRIORITY 1: Try Binance first for real OHLCV data (major tokens)
    // This is the BEST source because it provides real candlestick data with volume
    if (tokenSymbol && binanceService.hasSymbol(tokenSymbol)) {
      try {
        const binanceOhlcv = await binanceService.getOHLCV(tokenSymbol, '1h', days || 30);
        if (binanceOhlcv && binanceOhlcv.length > 0) {
          ohlcv = binanceOhlcv;
          prices = ohlcv.map(candle => candle.close);
          dataSource = 'binance';
          logger.info(`TA: Using Binance OHLCV data for ${tokenSymbol} (${binanceOhlcv.length} candles)`);
        }
      } catch (e) {
        logger.warn(`Binance OHLCV failed for ${tokenSymbol}:`, e);
      }
    }

    // PRIORITY 2: Try Birdeye OHLCV for tokens with addresses (DeFi tokens)
    if (ohlcv.length === 0 && chain && address) {
      try {
        ohlcv = await birdeyeService.getOHLCVData(address, chain, days || 30, '1H');
        if (ohlcv && ohlcv.length > 0) {
          prices = ohlcv.map((candle) => candle.close);
          dataSource = 'birdeye';
          logger.info(`TA: Using Birdeye OHLCV data for ${address} (${ohlcv.length} candles)`);
        }
      } catch (e) {
        logger.warn(`Birdeye OHLCV failed for ${address}:`, e);
      }
    }

    // PRIORITY 3: Try DexScreener if Birdeye fails
    if (ohlcv.length === 0 && chain && address) {
      try {
        const { dexScreenerService } = require('../services/dexscreener.service');
        ohlcv = await dexScreenerService.getOHLCVData(address, chain);
        if (ohlcv && ohlcv.length > 0) {
          prices = ohlcv.map((candle) => candle.close);
          dataSource = 'dexscreener';
          logger.info(`TA: Using DexScreener OHLCV data for ${address}`);
        }
      } catch (e) {
        // Continue to CoinGecko fallback
      }
    }

    // PRIORITY 4: CoinGecko fallback (price data only - LIMITED OHLCV)
    // ⚠️ WARNING: CoinGecko doesn't provide true OHLCV, so advanced indicators will be less accurate
    if (prices.length === 0 && tokenId) {
      try {
        const data = await coingeckoService.getMarketChart(tokenId, days || 30);
        if (data && data.prices && data.prices.length > 0) {
          prices = data.prices.map(p => p[1]);
          // Construct APPROXIMATE OHLCV from price data
          // This is NOT ideal - H/L are estimated, volume is 0
          ohlcv = data.prices.map((p: any, idx: number) => {
            const price = p[1];
            const prevPrice = idx > 0 ? data.prices[idx - 1][1] : price;
            return {
              timestamp: p[0],
              open: prevPrice,
              high: Math.max(price, prevPrice) * 1.005, // Approximate 0.5% range
              low: Math.min(price, prevPrice) * 0.995,
              close: price,
              volume: 0 // ⚠️ No volume data from CoinGecko market chart
            };
          });
          dataSource = 'coingecko_limited';
          logger.warn(`TA: Using CoinGecko LIMITED data for ${tokenId} - advanced indicators may be inaccurate`);
        }
      } catch (e) {
        logger.warn(`CoinGecko market chart failed for ${tokenId}:`, e);
      }
    }

    // PRIORITY 5: Try to resolve tokenId from chain+address and use CoinGecko
    if (prices.length === 0 && chain && address) {
      try {
        const details = await coingeckoService.getCoinDetailsByAddress(chain, address);
        if (details && details.id) {
          const data = await coingeckoService.getMarketChart(details.id, days || 30);
          if (data && data.prices) {
            prices = data.prices.map(p => p[1]);
            ohlcv = data.prices.map((p: any) => ({
              timestamp: p[0],
              open: p[1],
              high: p[1],
              low: p[1],
              close: p[1],
              volume: 0
            }));
            dataSource = 'coingecko_limited';
          }
        }
      } catch (e) {
        // Final fallback failed
      }
    }

    if (prices.length === 0) {
      return { error: 'No price data available from Binance, Birdeye, DexScreener, or CoinGecko' };
    }

    const currentPrice = prices[prices.length - 1];
    const hasRealOHLCV = dataSource === 'binance' || dataSource === 'birdeye' || dataSource === 'dexscreener';
    const hasVolume = ohlcv.some(c => c.volume > 0);

    // ========== BASIC INDICATORS ==========
    const rsi = TechnicalAnalysis.calculateRSI(prices, 14);
    const sma20 = TechnicalAnalysis.calculateSMA(prices, 20);
    const ema20 = TechnicalAnalysis.calculateEMA(prices, 20);
    const macd = TechnicalAnalysis.calculateMACD(prices);

    const latestRSI = rsi[rsi.length - 1];
    const latestSMA = sma20[sma20.length - 1];
    const latestEMA = ema20[ema20.length - 1];
    const latestMACD = macd.macd[macd.macd.length - 1];
    const latestSignal = macd.signal[macd.signal.length - 1];
    const latestHistogram = macd.histogram[macd.histogram.length - 1];

    // ========== ADVANCED INDICATORS (2025 META) ==========
    let advancedIndicators: any = {};
    let dataQualityWarnings: string[] = [];

    // Add data quality warnings
    if (!hasRealOHLCV) {
      dataQualityWarnings.push('⚠️ NO REAL OHLCV DATA - Using approximated candlesticks from close prices only');
    }
    if (!hasVolume) {
      dataQualityWarnings.push('⚠️ NO VOLUME DATA - CVD, Volume Profile, and VW-MACD will be unreliable');
    }

    if (ohlcv.length > 20) { // Only calculate advanced if we have enough data
      // 1. CVD - Orderflow Divergence (REQUIRES VOLUME)
      const cvdResult = hasVolume 
        ? TechnicalAnalysis.calculateCVD(ohlcv)
        : { cvd: [], divergence: false };
      
      // 2. ICT Order Blocks & Fair Value Gaps (REQUIRES REAL OHLCV)
      const ictResult = hasRealOHLCV
        ? TechnicalAnalysis.detectOrderBlocksAndFVG(ohlcv)
        : { orderBlocks: [], fairValueGaps: [] };
      
      // 3. Volume Profile (VPFR) (REQUIRES VOLUME)
      const vpResult = hasVolume
        ? TechnicalAnalysis.calculateVolumeProfile(ohlcv, 20)
        : { poc: currentPrice, valueArea: { high: currentPrice * 1.05, low: currentPrice * 0.95 }, profile: [] };
      
      // 4. Heikin-Ashi + SuperTrend (Works with any OHLCV)
      const haCandles = TechnicalAnalysis.calculateHeikinAshi(ohlcv);
      const stResult = TechnicalAnalysis.calculateSuperTrend(haCandles, 10, 3);
      const currentSuperTrend = stResult.trend[stResult.trend.length - 1];
      
      // 5. Bollinger Bands Squeeze & Keltner Channel
      const bbResult = TechnicalAnalysis.calculateBollingerBands(prices, 20, 2);
      const kcResult = TechnicalAnalysis.calculateKeltnerChannel(ohlcv, 20, 2);
      
      // Check for BB squeeze breakout (price outside Keltner while BB squeezed)
      const currentBBUpper = bbResult.upper[bbResult.upper.length - 1];
      const currentBBLower = bbResult.lower[bbResult.lower.length - 1];
      const currentKCUpper = kcResult.upper[kcResult.upper.length - 1];
      const currentKCLower = kcResult.lower[kcResult.lower.length - 1];
      const breakout = (currentPrice > currentKCUpper || currentPrice < currentKCLower) && bbResult.squeeze;
      
      // 6. Volume-Weighted MACD (REQUIRES VOLUME for accuracy)
      const vwmacd = hasVolume 
        ? TechnicalAnalysis.calculateVolumeWeightedMACD(ohlcv, 12, 26, 9)
        : macd; // Fall back to regular MACD if no volume
      const latestVWMACD = vwmacd.macd[vwmacd.macd.length - 1];
      const latestVWSignal = vwmacd.signal[vwmacd.signal.length - 1];
      const latestVWHistogram = vwmacd.histogram[vwmacd.histogram.length - 1];
      
      // 7. Fibonacci Levels
      const swingPoints = TechnicalAnalysis.detectSwingPoints(ohlcv, 20);
      const fibResult = TechnicalAnalysis.calculateFibonacci(swingPoints.swingHigh, swingPoints.swingLow);
      
      // Check if price is near key Fib levels
      const fibLevels = Object.values(fibResult.retracement);
      const nearFib = fibLevels.find(level => Math.abs(currentPrice - level) / currentPrice < 0.02); // Within 2%
      
      // 8. Multi-Timeframe Alignment
      const mtfResult = TechnicalAnalysis.calculateMTFAlignment(prices);

      advancedIndicators = {
        data_quality: {
          source: dataSource,
          has_real_ohlcv: hasRealOHLCV,
          has_volume: hasVolume,
          warnings: dataQualityWarnings,
          reliability: hasRealOHLCV && hasVolume ? 'HIGH' : hasRealOHLCV ? 'MEDIUM' : 'LOW'
        },
        cvd: {
          bullish_divergence: hasVolume ? cvdResult.divergence : false,
          reliable: hasVolume,
          description: !hasVolume 
            ? '⚠️ CVD UNRELIABLE - no volume data available'
            : cvdResult.divergence 
              ? 'CVD rising while price falling - whale accumulation detected' 
              : 'No divergence'
        },
        ict_orderflow: {
          order_blocks: ictResult.orderBlocks.slice(-2), // Last 2 order blocks
          fair_value_gaps: ictResult.fairValueGaps.slice(-2),
          active_zones: ictResult.orderBlocks.length + ictResult.fairValueGaps.length,
          reliable: hasRealOHLCV,
          description: !hasRealOHLCV
            ? '⚠️ ORDER BLOCKS UNRELIABLE - no real OHLCV data'
            : ictResult.orderBlocks.length > 0 
              ? `${ictResult.orderBlocks.length} institutional zones detected` 
              : 'No major order blocks'
        },
        volume_profile: {
          poc: vpResult.poc,
          value_area_high: vpResult.valueArea.high,
          value_area_low: vpResult.valueArea.low,
          price_near_poc: hasVolume ? Math.abs(currentPrice - vpResult.poc) / currentPrice < 0.03 : false,
          reliable: hasVolume,
          description: !hasVolume
            ? '⚠️ VOLUME PROFILE UNRELIABLE - no volume data'
            : Math.abs(currentPrice - vpResult.poc) / currentPrice < 0.03 
              ? `Price near high-volume POC at $${vpResult.poc.toFixed(4)} - strong support/resistance`
              : 'Price outside value area'
        },
        heikin_ashi_supertrend: {
          trend: currentSuperTrend,
          supertrend_level: stResult.supertrend[stResult.supertrend.length - 1],
          reliable: true, // Works with any OHLCV
          description: currentSuperTrend === 'up' ? 'SuperTrend bullish - price above support' : 'SuperTrend bearish - price below resistance'
        },
        bollinger_squeeze: {
          squeeze: bbResult.squeeze,
          breakout: breakout,
          breakout_direction: currentPrice > currentKCUpper ? 'bullish' : currentPrice < currentKCLower ? 'bearish' : 'none',
          reliable: true, // Works with price data
          description: breakout ? `Squeeze breakout ${currentPrice > currentKCUpper ? 'UP' : 'DOWN'} - high volatility expansion expected` : 
                       bbResult.squeeze ? 'Bollinger squeeze detected - volatility contraction, breakout imminent' : 'Normal volatility'
        },
        vw_macd: {
          macd_line: latestVWMACD,
          signal_line: latestVWSignal,
          histogram: latestVWHistogram,
          crossover: latestVWHistogram > 0 && vwmacd.histogram[vwmacd.histogram.length - 2] <= 0,
          reliable: hasVolume,
          description: !hasVolume 
            ? '⚠️ VW-MACD UNRELIABLE - using regular MACD (no volume data)'
            : latestVWHistogram > 0 ? 'Volume-weighted MACD bullish' : 'Volume-weighted MACD bearish'
        },
        fibonacci: {
          swing_high: swingPoints.swingHigh,
          swing_low: swingPoints.swingLow,
          key_retracements: {
            '38.2%': fibResult.retracement['38.2'],
            '50%': fibResult.retracement['50'],
            '61.8%': fibResult.retracement['61.8']
          },
          near_key_level: nearFib ? nearFib : null,
          reliable: hasRealOHLCV, // More accurate with real H/L
          description: nearFib ? `Price near Fibonacci level $${nearFib.toFixed(4)} - potential bounce zone` : 'No Fib level nearby'
        },
        mtf_alignment: {
          score: mtfResult.score,
          aligned: mtfResult.aligned,
          bias: mtfResult.bias,
          reliable: true, // Works with close prices
          description: mtfResult.aligned && mtfResult.score > 75 
            ? `Strong ${mtfResult.bias} trend - all timeframes aligned (${mtfResult.score.toFixed(0)}% score)`
            : mtfResult.score > 50 
            ? `Moderate ${mtfResult.bias} bias (${mtfResult.score.toFixed(0)}%)`
            : 'Choppy market - no clear trend alignment'
        }
      };
    }

    // Generate overall signal quality score
    // Minimum 2 confluences needed for a valid signal (balanced threshold)
    // IMPORTANT: Only count RELIABLE indicators as confluences
    let signalQuality = 0;
    let confidenceBoost = 0;
    let confluenceCount = 0;
    const insights: string[] = [];
    const warnings: string[] = [];

    // Add data quality warning if applicable
    if (dataQualityWarnings.length > 0) {
      warnings.push(...dataQualityWarnings);
    }

    // Check for conflicting signals (bearish indicators in bullish setup or vice versa)
    const bullishSignals: string[] = [];
    const bearishSignals: string[] = [];

    // Only count CVD if we have volume data
    if (advancedIndicators.cvd?.bullish_divergence && advancedIndicators.cvd?.reliable) {
      confidenceBoost += 12;
      confluenceCount++;
      bullishSignals.push('CVD');
      insights.push('✅ CVD bullish divergence - whale accumulation');
    }
    // Only count ICT zones if we have real OHLCV
    if (advancedIndicators.ict_orderflow?.active_zones > 2 && advancedIndicators.ict_orderflow?.reliable) {
      confidenceBoost += 8;
      confluenceCount++;
      insights.push('✅ Multiple ICT zones active - institutional interest');
    }
    // Only count Volume Profile if we have volume data
    if (advancedIndicators.volume_profile?.price_near_poc && advancedIndicators.volume_profile?.reliable) {
      confidenceBoost += 8;
      confluenceCount++;
      insights.push('✅ Price at POC - high-volume support/resistance');
    }
    // SuperTrend works with any OHLCV
    if (advancedIndicators.heikin_ashi_supertrend?.trend === 'up') {
      confidenceBoost += 10;
      confluenceCount++;
      bullishSignals.push('SuperTrend');
      insights.push('✅ SuperTrend bullish');
    } else if (advancedIndicators.heikin_ashi_supertrend?.trend === 'down') {
      bearishSignals.push('SuperTrend');
    }
    // BB Squeeze works with price data
    if (advancedIndicators.bollinger_squeeze?.breakout) {
      confidenceBoost += 15;
      confluenceCount++;
      if (advancedIndicators.bollinger_squeeze.breakout_direction === 'bullish') {
        bullishSignals.push('BB Breakout');
      } else {
        bearishSignals.push('BB Breakout');
      }
      insights.push(`🚀 BB Squeeze breakout ${advancedIndicators.bollinger_squeeze.breakout_direction} - volatility expansion!`);
    }
    // Only count VW-MACD if we have volume, otherwise it's just regular MACD
    if (advancedIndicators.vw_macd?.crossover && advancedIndicators.vw_macd?.reliable) {
      confidenceBoost += 12;
      confluenceCount++;
      bullishSignals.push('VW-MACD');
      insights.push('✅ VW-MACD bullish crossover');
    } else if (advancedIndicators.vw_macd?.histogram && advancedIndicators.vw_macd.histogram < 0) {
      bearishSignals.push('VW-MACD');
    }
    // Fibonacci is more reliable with real OHLCV but still useful
    if (advancedIndicators.fibonacci?.near_key_level) {
      const fibBoost = advancedIndicators.fibonacci?.reliable ? 6 : 3;
      confidenceBoost += fibBoost;
      confluenceCount++;
      insights.push('✅ Price near Fibonacci level');
    }
    // MTF Alignment works with close prices
    if (advancedIndicators.mtf_alignment?.aligned && advancedIndicators.mtf_alignment?.score > 70) {
      const mtfBoost = advancedIndicators.mtf_alignment.score > 85 ? 18 : 12;
      confidenceBoost += mtfBoost;
      confluenceCount++;
      if (advancedIndicators.mtf_alignment.bias === 'bullish') {
        bullishSignals.push('MTF');
      } else {
        bearishSignals.push('MTF');
      }
      insights.push(`✅ MTF aligned ${advancedIndicators.mtf_alignment.bias} - ${advancedIndicators.mtf_alignment.score.toFixed(0)}% score`);
    }

    // Check for conflicting signals - this is a RED FLAG
    if (bullishSignals.length > 0 && bearishSignals.length > 0) {
      warnings.push(`⚠️ CONFLICTING SIGNALS: Bullish(${bullishSignals.join(',')}) vs Bearish(${bearishSignals.join(',')})`);
      confidenceBoost = Math.max(0, confidenceBoost - 30); // Heavy penalty for conflicts
    }
    
    // Add penalty for low data quality
    if (!hasRealOHLCV) {
      warnings.push('⚠️ LOW DATA QUALITY: Advanced volume-based indicators are unreliable');
      confidenceBoost = Math.max(0, confidenceBoost - 15);
    }

    // Check MTF alignment - critical for signal quality
    if (!advancedIndicators.mtf_alignment?.aligned || (advancedIndicators.mtf_alignment?.score || 0) < 50) {
      warnings.push(`⚠️ MTF NOT ALIGNED: Score ${advancedIndicators.mtf_alignment?.score?.toFixed(0) || 0}% - high risk of false signal`);
      confidenceBoost = Math.max(0, confidenceBoost - 20);
    }

    // Minimum confluence requirement
    if (confluenceCount < 3) {
      warnings.push(`⚠️ INSUFFICIENT CONFLUENCES: Only ${confluenceCount}/3 minimum met`);
    }

    signalQuality = Math.min(confidenceBoost, 100);

    // Calculate ATR for stop-loss recommendations
    const atr = TechnicalAnalysis.calculateATR(ohlcv, 14);
    const latestATR = atr[atr.length - 1] || 0;
    const atrPercent = (latestATR / currentPrice) * 100;
    
    // Calculate recommended stop-loss levels based on ATR
    const recommendedStopLoss = {
      tight: currentPrice - (latestATR * 1.5), // 1.5x ATR (not recommended for day trading)
      normal: currentPrice - (latestATR * 2), // 2x ATR (day trade minimum)
      wide: currentPrice - (latestATR * 3), // 3x ATR (swing trade)
      tight_percent: ((latestATR * 1.5) / currentPrice) * 100,
      normal_percent: ((latestATR * 2) / currentPrice) * 100,
      wide_percent: ((latestATR * 3) / currentPrice) * 100,
    };
    
    // Determine if current volatility supports day trading
    const volatilityAssessment = atrPercent < 3 
      ? 'low_volatility' 
      : atrPercent < 8 
      ? 'moderate_volatility' 
      : 'high_volatility';
    
    // Trading style recommendation based on volatility
    const tradingStyleRecommendation = atrPercent < 3 
      ? 'swing_trade' // Low volatility = need longer timeframe for meaningful moves
      : atrPercent < 10 
      ? 'day_trade' // Moderate volatility = ideal for day trading
      : 'caution'; // High volatility = be careful, use wider stops

    return {
      current_price: currentPrice,
      
      // Basic indicators
      rsi_14: latestRSI,
      sma_20: latestSMA,
      ema_20: latestEMA,
      macd: {
        macd_line: latestMACD,
        signal_line: latestSignal,
        histogram: latestHistogram
      },
      trend: latestMACD > latestSignal ? 'bullish' : 'bearish',
      rsi_condition: latestRSI > 70 ? 'overbought' : latestRSI < 30 ? 'oversold' : 'neutral',
      
      // ATR and Stop-Loss Guidance (CRITICAL for day trading)
      atr: {
        value: latestATR,
        percent: atrPercent,
        recommended_stop_loss: recommendedStopLoss,
        volatility_assessment: volatilityAssessment,
        trading_style_recommendation: tradingStyleRecommendation,
        description: `ATR: $${latestATR.toFixed(4)} (${atrPercent.toFixed(2)}%). Recommended day trade stop: ${recommendedStopLoss.normal_percent.toFixed(1)}% below entry. Swing trade stop: ${recommendedStopLoss.wide_percent.toFixed(1)}% below entry.`
      },
      
      // Advanced 2025 meta indicators
      advanced: advancedIndicators,
      
      // Overall assessment
      signal_quality_score: signalQuality,
      confluence_count: confluenceCount,
      minimum_confluences_met: confluenceCount >= 3,
      confidence_boost: `+${confidenceBoost}%`,
      key_insights: insights,
      warnings: warnings,
      
      // Clear recommendation
      recommendation: warnings.length > 0
        ? `⚠️ CAUTION: ${warnings.length} warning(s) detected. ${warnings.join(' ')}`
        : confluenceCount >= 3 && signalQuality >= 50
        ? `🔥 Good setup! ${confluenceCount} confluences aligned. Consider signal with ${signalQuality}% quality score.`
        : `⚪ Marginal setup - only ${confluenceCount} confluences. Wait for better opportunity.`,
      
      summary: insights.length >= 3 && warnings.length === 0
        ? `🔥 STRONG SETUP: ${insights.length} bullish factors aligned with no conflicting signals.` 
        : insights.length > 0 && warnings.length > 0
        ? `⚠️ MIXED SIGNALS: ${insights.length} positive factors but ${warnings.length} warnings. SKIP recommended.`
        : 'Standard setup - insufficient confluences for high-probability trade.'
    };
  },
});

/**
 * Chart Image Analysis Tool
 * Returns TradingView chart URLs for visual analysis by the LLM
 * This allows agents to SEE the actual price action, patterns, and structure
 */
export const getChartImageTool = createTool({
  name: 'get_chart_image',
  description: 'Get TradingView chart image URLs for visual analysis. Use this to SEE actual price action, chart patterns, support/resistance levels, and market structure. CRITICAL: Always analyze charts visually before generating signals to confirm technical setup.',
  schema: z.object({
    symbol: z.string().describe('The trading symbol (e.g. "BTC", "ETH", "SOL") - just the symbol, not the pair'),
    interval: z.enum(['1', '5', '15', '60', '240', 'D', 'W']).default('60').describe('Chart interval: 1=1min, 5=5min, 15=15min, 60=1hour, 240=4hour, D=daily, W=weekly'),
  }) as any,
  fn: async ({ symbol, interval = '60' }: { symbol: string; interval?: string }) => {
    try {
      // Normalize symbol (remove USDT if present, just need base symbol)
      const baseSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
      
      // Map interval string to Binance format
      const intervalMap: Record<string, string> = {
        '1': '1m',
        '5': '5m', 
        '15': '15m',
        '30': '30m',
        '60': '1h',
        '120': '2h',
        '240': '4h',
        'D': '1d',
        'W': '1w',
      } as const;
      
      const binanceInterval = (intervalMap[interval as keyof typeof intervalMap] || '1h') as '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
      
      // Fetch real OHLCV data from Binance
      const ohlcv = await binanceService.getOHLCV(baseSymbol, binanceInterval, 100);
      
      if (!ohlcv || ohlcv.length < 20) {
        return {
          error: `Could not fetch OHLCV data for ${baseSymbol}`,
          fallback: 'Use get_technical_analysis for numerical indicators instead',
        };
      }
      
      // Generate actual PNG chart image
      const chartResult = await chartImageService.generateCandlestickChart(
        ohlcv,
        baseSymbol,
        {
          title: `${baseSymbol}/USDT - ${interval === 'D' ? 'Daily' : interval === 'W' ? 'Weekly' : interval + ' min'} Chart`,
          showVolume: true,
          showSMA: [20, 50],
          darkMode: true,
        }
      );
      
      // Generate text-based chart description for additional context
      const chartDescription = chartImageService.generateChartDescription(ohlcv);
      
      return {
        symbol: baseSymbol,
        interval: interval,
        candles_analyzed: ohlcv.length,
        chart_image: {
          base64: chartResult.base64,
          mimeType: chartResult.mimeType,
          width: chartResult.width,
          height: chartResult.height,
          description: `PNG chart image for ${baseSymbol} - can be sent to vision-capable LLM`,
        },
        chart_analysis: chartDescription,
        latest_price: ohlcv[ohlcv.length - 1].close,
        analysis_instructions: `
📊 CHART IMAGE GENERATED:
This is an actual PNG image of the ${baseSymbol} chart with:
- Candlestick price action (green=bullish, red=bearish)
- High/Low range lines (dashed)
- Close price line (blue)
- SMA 20 (orange) and SMA 50 (pink)
- Volume bars at the bottom

🔍 VISUAL ANALYSIS CHECKLIST:
1. Trend Direction: Follow the SMA crossovers and price structure
2. Support/Resistance: Look for price reaction zones
3. Volume: Higher volume confirms moves
4. Momentum: Green vs red candle dominance
5. Patterns: Look for flags, triangles, double tops/bottoms
`,
      };
    } catch (error: any) {
      logger.error('Chart image tool error:', error);
      return {
        error: `Failed to generate chart image: ${error.message}`,
        fallback: 'Use technical indicators from get_technical_analysis tool instead',
      };
    }
  },
});

export const getFundamentalAnalysisTool = createTool({
  name: 'get_fundamental_analysis',
  description: 'Get fundamental metrics (Market Cap, FDV, Volume) for a token using CoinGecko ID OR (Chain + Address).',
  schema: z.object({
    tokenId: z.string().optional().describe('The CoinGecko API ID of the token'),
    chain: z.string().optional().describe('The blockchain network'),
    address: z.string().optional().describe('The token contract address'),
  }) as any,
  fn: async ({ tokenId, chain, address }) => {
    let details = null;

    if (chain && address) {
      details = await coingeckoService.getCoinDetailsByAddress(chain, address);
    }

    if (!details && tokenId) {
      details = await coingeckoService.getCoinDetails(tokenId);
    }

    if (!details) return { error: 'Failed to fetch coin details' };

    const marketData = details.market_data;
      
      return {
        market_cap: marketData.market_cap?.usd,
        fully_diluted_valuation: marketData.fully_diluted_valuation?.usd,
        total_volume: marketData.total_volume?.usd,
        circulating_supply: marketData.circulating_supply,
        total_supply: marketData.total_supply,
        max_supply: marketData.max_supply,
        ath: marketData.ath?.usd,
        ath_change_percentage: marketData.ath_change_percentage?.usd,
        atl: marketData.atl?.usd,
        atl_change_percentage: marketData.atl_change_percentage?.usd,
        description: details.description?.en ? details.description.en.substring(0, 200) + '...' : 'No description',
        links: {
          homepage: details.links?.homepage?.[0],
          twitter_screen_name: details.links?.twitter_screen_name,
        }
      };
  },
});

export const getYieldPoolsTool = createTool({
  name: 'get_yield_pools',
  description: 'Get top yield farming pools from DeFi Llama',
  fn: async () => {
    const pools = await defillamaService.getYieldPools();
    return { pools };
  },
});

export const requestCustomScanTool = createTool({
  name: 'request_custom_scan',
  description: 'Request a deep-dive token analysis. ONLY for DIAMOND tier users. Triggers a comprehensive scan including price action, narratives, on-chain data, and technical analysis.',
  schema: z.object({
    tokenSymbol: z.string().describe('The token symbol to scan (e.g. "SOL", "BTC", "BONK")'),
    walletAddress: z.string().describe('The user\'s wallet address for tier validation'),
    telegramUserId: z.number().describe('The user\'s Telegram user ID'),
  }) as any,
  fn: async ({ tokenSymbol, walletAddress, telegramUserId }) => {
    console.log('🔥🔥🔥 request_custom_scan TOOL INVOKED 🔥🔥🔥');
    console.log('Parameters:', { tokenSymbol, walletAddress, telegramUserId });
    
    const { TIERS } = await import('../constants/tiers');
    
    // Handle telegramUserId as either string or number
    const userId = typeof telegramUserId === 'string' ? parseInt(telegramUserId, 10) : telegramUserId;
    console.log('Parsed userId:', userId);
    
    // Validate user exists and is DIAMOND tier (or has temporary access)
    console.log('Fetching user from DB:', walletAddress);
    const user = await supabaseService.getUser(walletAddress);
    console.log('User fetched:', user ? `${user.wallet_address} (${user.tier})` : 'NOT FOUND');
    
    if (!user) {
      return { 
        success: false, 
        error: 'User not found. Please verify your wallet first with /verify',
        tier_required: 'DIAMOND'
      };
    }
    
    // Check for effective tier (respects temporary diamond access)
    const effectiveTier = await supabaseService.getEffectiveTier(walletAddress);
    console.log('Effective tier:', effectiveTier);
    
    if (effectiveTier !== TIERS.DIAMOND) {
      return { 
        success: false, 
        error: `This feature is exclusive to DIAMOND tier users (1,000+ $RGE). Your current tier: ${user.tier}`,
        tier_required: 'DIAMOND',
        current_tier: user.tier
      };
    }
    
    // Create custom request
    console.log('Creating custom request in DB for:', { walletAddress, tokenSymbol });
    const request = await supabaseService.createCustomRequest({
      user_wallet_address: walletAddress,
      token_symbol: tokenSymbol,
      status: 'pending',
    });
    console.log('Custom request created! ID:', request.id);
    
    // Trigger orchestrator (async)
    console.log('Importing and triggering orchestrator for request:', request.id);
    const { orchestrator } = await import('./orchestrator');
    orchestrator.processCustomRequest(request.id, tokenSymbol, walletAddress)
      .catch((err: any) => console.error('Error processing custom request:', err));
    console.log('Orchestrator triggered (async)');
    
    const result = {
      success: true,
      message: `Scan initiated for ${tokenSymbol}. You will receive the analysis via Telegram shortly.`,
      request_id: request.id,
    };
    console.log('Tool returning success:', result);
    return result;
  },
});

export const getRecentSignalsTool = createTool({
  name: 'get_recent_signals',
  description: 'Get recent trading signals generated by the platform. Use this when the user asks about recent signals or trading opportunities.',
  schema: z.object({
    limit: z.number().optional().describe('Number of signals to fetch (default 5)'),
  }) as any,
  fn: async ({ limit = 5 }) => {
    const signals = await supabaseService.getRecentSignals(limit);
    return {
      signals: signals.map((s: any) => ({
        symbol: s.content?.token?.symbol,
        action: s.content?.action,
        entry: s.content?.entry_price,
        tp: s.content?.tp_price,
        sl: s.content?.sl_price,
        reasoning: s.content?.reasoning,
        date: s.created_at
      }))
    };
  },
});

export const getRecentIntelTool = createTool({
  name: 'get_recent_intel',
  description: 'Get recent market intelligence and deep dives. Use this when the user asks about market analysis, news, or deep dives.',
  schema: z.object({
    limit: z.number().optional().describe('Number of intel items to fetch (default 5)'),
  }) as any,
  fn: async ({ limit = 5 }) => {
    const intels = await supabaseService.getRecentIntels(limit);
    return {
      intel: intels.map((i: any) => ({
        topic: i.content?.topic,
        insight: i.content?.insight,
        sentiment: i.content?.sentiment,
        date: i.created_at
      }))
    };
  },
});

export const getYieldOpportunitiesTool = createTool({
  name: 'get_yield_opportunities',
  description: 'Get top yield farming opportunities. Use this when the user asks about yield, farming, or APY.',
  schema: z.object({
    limit: z.number().optional().describe('Number of opportunities to fetch (default 5)'),
  }) as any,
  fn: async ({ limit = 5 }) => {
    const { opportunities } = await supabaseService.getLatestYieldOpportunities(1, limit);
    return {
      opportunities: opportunities?.map((o: any) => ({
        protocol: o.protocol,
        chain: o.chain,
        pool: o.pool_id,
        apy: o.apy,
        tvl: o.tvl_usd,
        risk: o.il_risk
      }))
    };
  },
});

export const getAirdropsTool = createTool({
  name: 'get_airdrops',
  description: 'Get promising airdrop opportunities. Use this when the user asks about airdrops.',
  schema: z.object({
    limit: z.number().optional().describe('Number of airdrops to fetch (default 5)'),
  }) as any,
  fn: async ({ limit = 5 }) => {
    const { airdrops } = await supabaseService.getAirdrops(1, limit);
    return {
      airdrops: airdrops?.map((a: any) => ({
        project: a.ticker,
        chain: a.chain,
        type: a.type,
        potential_value: a.est_value_usd,
        tasks: a.tasks,
        score: a.rogue_score
      }))
    };
  },
});

export const getPredictionMarketsTool = createTool({
  name: 'get_prediction_markets',
  description: 'Get high-edge prediction market opportunities from Polymarket. Use this when the user asks about prediction markets, bets, betting, Polymarket, or market predictions with edge. These are markets where Rogue has identified a 12%+ edge.',
  schema: z.object({
    limit: z.number().optional().describe('Number of prediction markets to fetch (default 5)'),
  }) as any,
  fn: async ({ limit = 5 }) => {
    const client = supabaseService.getClient();
    const { data, error } = await client
      .from('prediction_markets_cache')
      .select('*')
      .eq('is_active', true)
      .gte('edge_percent', 12)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      prediction_markets: (data || []).map((m: any) => ({
        title: m.title,
        platform: m.platform,
        category: m.category,
        yes_price: m.yes_price,
        implied_probability: m.implied_probability,
        rogue_probability: m.rogue_probability,
        edge_percent: m.edge_percent,
        recommended_bet: m.recommended_bet,
        confidence_score: m.confidence_score,
        volume_usd: m.volume_usd,
        reasoning: m.analysis_reasoning,
        market_url: m.market_url,
        last_analyzed: m.last_analyzed_at
      }))
    };
  },
});
