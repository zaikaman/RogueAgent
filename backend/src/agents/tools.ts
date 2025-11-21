import { createTool } from '@iqai/adk';
const z = require('@iqai/adk/node_modules/zod');
import { coingeckoService } from '../services/coingecko.service';
import { supabaseService } from '../services/supabase.service';
import { twitterService } from '../services/twitter.service';
import { telegramService } from '../services/telegram.service';
import { tavilyService } from '../services/tavily.service';
import { birdeyeService } from '../services/birdeye.service';
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
  description: 'Get current price of a token in USD using CoinGecko ID.',
  schema: z.object({
    tokenId: z.string().describe('The CoinGecko API ID of the token (e.g. "bitcoin", "solana")'),
  }) as any,
  fn: async ({ tokenId }) => {
    if (tokenId) {
      const price = await coingeckoService.getPrice(tokenId);
      return { tokenId, price };
    }
    return { error: "Must provide tokenId" };
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
    if (chain && address) {
      const history = await birdeyeService.getPriceHistory(address, chain, days || 7);
      return {
        prices: history.map((h: any) => [h.unixTime * 1000, h.value]),
        summary: `Fetched ${history.length} data points for ${address} on ${chain} over last ${days} days`
      };
    }
    if (tokenId) {
      const data = await coingeckoService.getMarketChart(tokenId, days || 7);
      if (!data) return { error: 'Failed to fetch market chart data' };
      
      // Simplify data to reduce token usage - just return prices
      // Format: [timestamp, price]
      return { 
        prices: data.prices,
        summary: `Fetched ${data.prices.length} data points for ${tokenId} over last ${days} days`
      };
    }
    return { error: "Must provide tokenId OR (chain and address)" };
  },
});

export const checkRecentSignalsTool = createTool({
  name: 'check_recent_signals',
  description: 'Check if a token has been signaled in the last 7 days',
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

    if (chain && address) {
      const history = await birdeyeService.getPriceHistory(address, chain, days || 30);
      prices = history.map((h: any) => h.value);
    } else if (tokenId) {
      const data = await coingeckoService.getMarketChart(tokenId, days || 30);
      if (data && data.prices) {
        prices = data.prices.map(p => p[1]);
      }
    } else {
      return { error: "Must provide tokenId OR (chain and address)" };
    }

    if (prices.length === 0) {
      return { error: 'No price data available' };
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
  description: 'Get fundamental metrics (Market Cap, FDV, Volume) for a token using CoinGecko ID.',
  schema: z.object({
    tokenId: z.string().describe('The CoinGecko API ID of the token'),
  }) as any,
  fn: async ({ tokenId }) => {
    if (tokenId) {
      const details = await coingeckoService.getCoinDetails(tokenId);
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
    }
    return { error: "Must provide tokenId" };
  },
});
