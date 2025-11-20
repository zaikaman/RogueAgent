import axios from 'axios';
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
        const response = await axios.post(
          `${this.baseUrl}/create_tweet_v2`,
          {
            tweet_text: text,
            login_cookies: config.TWITTER_LOGIN_COOKIES,
            proxy: config.TWITTER_PROXY,
          },
          {
            headers: {
              'X-API-Key': apiKey,
            },
          }
        );

        if (response.data?.status === 'success') {
          logger.info('Tweet posted successfully', { id: response.data?.tweet_id });
          return response.data?.tweet_id;
        } else {
          throw new Error(response.data?.msg || 'Unknown error from TwitterAPI.io');
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          logger.warn('Twitter rate limit hit');
          throw error; // Retry logic handles this
        }
        logger.error('Failed to post tweet', error.response?.data || error.message);
        throw error;
      }
    });
  }
}

export const twitterService = new TwitterService();
