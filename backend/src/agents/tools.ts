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
import { TechnicalAnalysis } from '../utils/ta.util';

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

export const searchTweetsTool = createTool({
  name: 'search_tweets',
  description: 'Search for tweets on Twitter (X) to gauge sentiment and find news',
  schema: z.object({
    query: z.string().describe('The search query (e.g. "Solana", "$SOL", "crypto AI")'),
    cursor: z.string().optional().describe('Pagination cursor'),
  }) as any,
  fn: async ({ query, cursor }) => {
    const result = await twitterService.searchTweets(query, cursor);
    // Simplify output to save tokens
    const tweets = result.tweets.map((t: any) => ({
      text: t.text,
      username: t.user?.username,
      likes: t.favorite_count,
      retweets: t.retweet_count,
      created_at: t.created_at
    })).slice(0, 10); // Limit to 10 tweets
    
    return { tweets, next_cursor: result.next_cursor };
  },
});

export const getTechnicalAnalysisTool = createTool({
  name: 'get_technical_analysis',
  description: 'Calculate technical indicators (RSI, MACD, SMA, EMA) for a token. Can use CoinGecko ID or (Chain + Address) for Birdeye.',
  schema: z.object({
    tokenId: z.string().optional().describe('The CoinGecko API ID of the token'),
    chain: z.string().optional().describe('The blockchain network (solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui, aptos)'),
    address: z.string().optional().describe('The token contract address for chain-based lookup'),
    days: z.number().optional().default(30).describe('Days of history to analyze (default: 30)'),
  }) as any,
  fn: async ({ tokenId, chain, address, days }) => {
    let prices: number[] = [];

    // Try Birdeye first
    if (chain && address) {
      try {
        const history = await birdeyeService.getPriceHistory(address, chain, days || 30);
        if (history && history.length > 0) {
          prices = history.map((h: any) => h.value);
        }
      } catch (e) {
        // Fallback to CoinGecko
      }
    }

    // Fallback to CoinGecko if prices are empty
    if (prices.length === 0) {
      let targetTokenId: string | undefined = tokenId;

      if (!targetTokenId && chain && address) {
        const details = await coingeckoService.getCoinDetailsByAddress(chain, address);
        if (details && details.id) {
          targetTokenId = details.id;
        }
      }

      if (targetTokenId) {
        const data = await coingeckoService.getMarketChart(targetTokenId, days || 30);
        if (data && data.prices) {
          prices = data.prices.map(p => p[1]);
        }
      }
    }

    if (prices.length === 0) {
      return { error: 'No price data available from Birdeye or CoinGecko' };
    }

    const currentPrice = prices[prices.length - 1];

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

    return {
      current_price: currentPrice,
      rsi_14: latestRSI,
      sma_20: latestSMA,
      ema_20: latestEMA,
      macd: {
        macd_line: latestMACD,
        signal_line: latestSignal,
        histogram: latestHistogram
      },
      trend: latestMACD > latestSignal ? 'bullish' : 'bearish',
      rsi_condition: latestRSI > 70 ? 'overbought' : latestRSI < 30 ? 'oversold' : 'neutral'
    };
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
    
    // Validate user exists and is DIAMOND tier
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
    
    if (user.tier !== TIERS.DIAMOND) {
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
