import { createTool } from '@iqai/adk';
import * as z from 'zod';
import { coingeckoService } from '../services/coingecko.service';
import { supabaseService } from '../services/supabase.service';
import { twitterService } from '../services/twitter.service';

export const getTrendingCoinsTool = createTool({
  name: 'get_trending_coins',
  description: 'Get top 7 trending coins from CoinGecko',
  fn: async () => {
    const coins = await coingeckoService.getTrending();
    return {
      coins: coins.map((c: any) => ({
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

export const checkRecentSignalsTool = createTool({
  name: 'check_recent_signals',
  description: 'Check if a token has been signaled in the last 7 days',
  schema: z.object({
    symbol: z.string(),
  }) as any,
  fn: async ({ symbol }) => {
    // Mock implementation for now until we add the method to supabaseService
    return { has_recent_signal: false, last_signal_date: null };
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
