import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';

class BirdeyeService {
  private baseUrl = 'https://public-api.birdeye.so';
  private currentKeyIndex = 0;
  private apiKeys: string[] = [];
  
  private get apiKey() {
    return config.BIRDEYE_API_KEY;
  }

  private getNextApiKey(): string | undefined {
    if (this.apiKeys.length === 0) return undefined;
    
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  private get headers() {
    const apiKey = this.getNextApiKey() || this.apiKey;
    return {
      'X-API-KEY': apiKey || '',
      'accept': 'application/json'
    };
  }

  private mapChain(chain: string): string {
    const map: { [key: string]: string } = {
      'bnb': 'bsc',
      'binance': 'bsc',
      'binance-smart-chain': 'bsc',
      'arbitrum-one': 'arbitrum',
      'polygon-pos': 'polygon',
      'optimistic-ethereum': 'optimism',
    };
    return map[chain.toLowerCase()] || chain.toLowerCase();
  }

  constructor() {
    // Initialize API keys array with round-robin rotation
    this.apiKeys = config.BIRDEYE_API_KEYS && config.BIRDEYE_API_KEYS.length > 0 
      ? config.BIRDEYE_API_KEYS 
      : (config.BIRDEYE_API_KEY ? [config.BIRDEYE_API_KEY] : []);
    
    if (this.apiKeys.length > 0) {
      logger.info(`Birdeye: Initialized with ${this.apiKeys.length} API key(s)`);
    } else {
      logger.warn('⚠️ BIRDEYE_API_KEY missing. Birdeye service will not function.');
    }
  }

  async getTrendingTokens(limit: number = 10, chain?: string): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      return await retry(async () => {
        const mappedChain = chain ? this.mapChain(chain) : undefined;
        const headers = mappedChain 
          ? { ...this.headers, 'x-chain': mappedChain }
          : this.headers;

        const response = await axios.get(`${this.baseUrl}/defi/token_trending`, {
          headers,
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
      }, 3, 2000, 2, (error: any) => {
        // Don't retry on client errors (4xx), except 429 (Too Many Requests)
        if (error.response && error.response.status) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            return false;
          }
        }
        return true;
      }); // Retry 3 times, start with 2s delay
    } catch (error: any) {
      logger.error(`Birdeye Trending API error${chain ? ` for chain ${chain}` : ''}:`, error.message);
      return [];
    }
  }

  async getPriceHistory(address: string, chain?: string, days: number = 7): Promise<any[]> {
    if (!this.apiKey) return [];
    
    // Calculate time_from and time_to
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - (days * 24 * 60 * 60);

    try {
      return await retry(async () => {
        const mappedChain = chain ? this.mapChain(chain) : undefined;
        const headers = mappedChain 
          ? { ...this.headers, 'x-chain': mappedChain }
          : this.headers;

        const response = await axios.get(`${this.baseUrl}/defi/history_price`, {
          headers,
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
      }, 3, 2000, 2, (error: any) => {
        // Don't retry on client errors (4xx), except 429 (Too Many Requests)
        if (error.response && error.response.status) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            return false;
          }
        }
        return true;
      });
    } catch (error: any) {
      logger.error(`Birdeye History API error for ${address}${chain ? ` on chain ${chain}` : ''}:`, error.message);
      return [];
    }
  }
}

export const birdeyeService = new BirdeyeService();
