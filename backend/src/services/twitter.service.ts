import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';

class TwitterService {
  private baseUrl = 'https://api.twitterapi.io/twitter';

  constructor() {
    if (!config.TWITTER_API_KEY) {
      logger.warn('⚠️ TWITTER_API_KEY missing. Twitter service will not function.');
    }
  }

  async postTweet(text: string): Promise<string | null> {
    if (!config.TWITTER_API_KEY) {
      logger.warn('Skipping tweet: No API key');
      return null;
    }

    return retry(async () => {
      try {
        const response = await axios.post(
          `${this.baseUrl}/tweet/create`,
          { text },
          {
            headers: {
              'X-API-Key': config.TWITTER_API_KEY,
            },
          }
        );

        logger.info('Tweet posted successfully', { id: response.data?.id });
        return response.data?.id || 'mock-id';
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
