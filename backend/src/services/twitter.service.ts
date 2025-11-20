import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';

class TwitterService {
  private baseUrl = 'https://api.twitterapi.io/twitter';

  private get apiKey() {
    return config.TWITTERIO_API_KEY || config.TWITTER_API_KEY;
  }

  constructor() {
    if (!this.apiKey) {
      logger.warn('⚠️ TWITTER_API_KEY/TWITTERIO_API_KEY missing. Twitter service will not function.');
    }
  }

  async postTweet(text: string): Promise<string | null> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      logger.warn('Skipping tweet: No API key');
      return null;
    }

    if (!config.TWITTER_LOGIN_COOKIES || !config.TWITTER_PROXY) {
      logger.warn('Skipping tweet: Missing TWITTER_LOGIN_COOKIES or TWITTER_PROXY. These are required for twitterapi.io v2.');
      return null;
    }

    return retry(async () => {
      try {
        const url = `${this.baseUrl}/create_tweet_v2`;
        const body = {
          login_cookies: config.TWITTER_LOGIN_COOKIES,
          tweet_text: text,
          proxy: config.TWITTER_PROXY
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 429) {
            logger.warn('Twitter rate limit hit');
            throw new Error('Rate limit hit');
          }
          logger.error('Failed to post tweet', data);
          throw new Error(data.msg || data.message || 'Unknown error from TwitterAPI.io');
        }

        if (data.status === 'success') {
          logger.info('Tweet posted successfully', { id: data.tweet_id });
          return data.tweet_id;
        } else {
          logger.warn(`API returned status: ${data.status} msg: ${data.msg || data.message}`);
          throw new Error(data.msg || 'Unknown error from TwitterAPI.io');
        }
      } catch (error: any) {
        logger.error('Failed to post tweet', error.message);
        throw error;
      }
    });
  }
}

export const twitterService = new TwitterService();
