import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';

class BirdeyeService {
  private baseUrl = 'https://public-api.birdeye.so';
  
  private get apiKey() {
    return config.BIRDEYE_API_KEY;
  }

  private get headers() {
    return {
      'X-API-KEY': this.apiKey || '',
      'accept': 'application/json'
    };
  }

  constructor() {
    if (!this.apiKey) {
      logger.warn('⚠️ BIRDEYE_API_KEY missing. Birdeye service will not function.');
    }
  }

  async getTrendingTokens(limit: number = 10, chain: string = 'solana'): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      return await retry(async () => {
        const response = await axios.get(`${this.baseUrl}/defi/token_trending`, {
          headers: { ...this.headers, 'x-chain': chain },
          params: {
            sort_by: 'rank',
            sort_type: 'asc',
            offset: 0,
            limit: limit
          }
        });

        if (response.data && response.data.success) {
          return response.data.data.tokens || [];
        }
        return [];
      }, 3, 2000); // Retry 3 times, start with 2s delay
    } catch (error: any) {
      logger.error('Birdeye Trending API error:', error.message);
      return [];
    }
  }

  async getTokenOverview(address: string, chain: string = 'solana'): Promise<any | null> {
    if (!this.apiKey) return null;

    try {
      return await retry(async () => {
        const response = await axios.get(`${this.baseUrl}/defi/token_overview`, {
          headers: { ...this.headers, 'x-chain': chain },
          params: { address }
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }
        return null;
      }, 3, 2000);
    } catch (error: any) {
      logger.error(`Birdeye Token Overview API error for ${address}:`, error.message);
      return null;
    }
  }

  async getPriceHistory(address: string, chain: string = 'solana', days: number = 7): Promise<any[]> {
    if (!this.apiKey) return [];
    
    // Calculate time_from and time_to
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - (days * 24 * 60 * 60);

    try {
      return await retry(async () => {
        const response = await axios.get(`${this.baseUrl}/defi/history_price`, {
          headers: { ...this.headers, 'x-chain': chain },
          params: {
            address: address,
            address_type: 'token',
            type: '1H', // 1 hour interval
            time_from: timeFrom,
            time_to: timeTo
          }
        });

        if (response.data && response.data.success) {
          return response.data.data.items || [];
        }
        return [];
      }, 3, 2000);
    } catch (error: any) {
      logger.error(`Birdeye History API error for ${address}:`, error.message);
      return [];
    }
  }
}

export const birdeyeService = new BirdeyeService();
