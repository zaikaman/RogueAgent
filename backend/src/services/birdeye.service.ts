import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

class BirdeyeService {
  private baseUrl = 'https://public-api.birdeye.so';
  
  private get apiKey() {
    return config.BIRDEYE_API_KEY;
  }

  private get headers() {
    return {
      'X-API-KEY': this.apiKey || '',
      'x-chain': 'solana', // Defaulting to Solana as it's popular for low caps on Birdeye
      'accept': 'application/json'
    };
  }

  constructor() {
    if (!this.apiKey) {
      logger.warn('⚠️ BIRDEYE_API_KEY missing. Birdeye service will not function.');
    }
  }

  async getTrendingTokens(limit: number = 10): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      const response = await axios.get(`${this.baseUrl}/defi/token_trending`, {
        headers: this.headers,
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
    } catch (error: any) {
      logger.error('Birdeye Trending API error:', error.message);
      return [];
    }
  }

  async getTokenOverview(address: string): Promise<any | null> {
    if (!this.apiKey) return null;

    try {
      const response = await axios.get(`${this.baseUrl}/defi/token_overview`, {
        headers: this.headers,
        params: { address }
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      logger.error(`Birdeye Token Overview API error for ${address}:`, error.message);
      return null;
    }
  }
}

export const birdeyeService = new BirdeyeService();
