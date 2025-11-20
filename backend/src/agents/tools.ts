import { createTool } from '@iqai/adk';
const z = require('@iqai/adk/node_modules/zod');
import { coingeckoService } from '../services/coingecko.service';
import { supabaseService } from '../services/supabase.service';
import { twitterService } from '../services/twitter.service';
import { telegramService } from '../services/telegram.service';

export const getTrendingCoinsTool = createTool({
  name: 'get_trending_coins',
  description: 'Get top 7 trending coins from CoinGecko',
  fn: async () => {
    const coins = await coingeckoService.getTrending();
    return {
      coins: coins.map((c: any) => ({
        id: c.item.id,
        name: c.item.name,
        symbol: c.item.symbol,
        market_cap_rank: c.item.market_cap_rank,
        price_btc: c.item.price_btc,
        score: c.item.score,
      })),
    };
  },
});

export const getTokenPriceTool = createTool({
  name: 'get_token_price',
  description: 'Get current price of a token in USD',
  schema: z.object({
    tokenId: z.string().describe('The CoinGecko API ID of the token (e.g. "bitcoin", "solana")'),
  }) as any,
  fn: async ({ tokenId }) => {
    const price = await coingeckoService.getPrice(tokenId);
    return { tokenId, price };
  },
});

export const getMarketChartTool = createTool({
  name: 'get_market_chart',
  description: 'Get historical market data (prices) for a token',
  schema: z.object({
    tokenId: z.string().describe('The CoinGecko API ID of the token'),
    days: z.number().optional().default(7).describe('Number of days of data to fetch (default: 7)'),
  }) as any,
  fn: async ({ tokenId, days }) => {
    const data = await coingeckoService.getMarketChart(tokenId, days || 7);
    if (!data) return { error: 'Failed to fetch market chart data' };
    
    // Simplify data to reduce token usage - just return prices
    // Format: [timestamp, price]
    return { 
      prices: data.prices,
      summary: `Fetched ${data.prices.length} data points for ${tokenId} over last ${days} days`
    };
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
