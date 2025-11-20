import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

interface CoinGeckoPrice {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

class CoinGeckoService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    if (config.COINGECKO_API_KEY) {
      // If we had a pro plan, we'd change the URL and add headers
      // this.baseUrl = 'https://pro-api.coingecko.com/api/v3';
    }
  }

  async getPrice(tokenId: string): Promise<number | null> {
    const cached = this.cache.get(tokenId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    try {
      const response = await axios.get<CoinGeckoPrice>(`${this.baseUrl}/simple/price`, {
        params: {
          ids: tokenId,
          vs_currencies: 'usd',
          include_24hr_change: true,
          x_cg_demo_api_key: config.COINGECKO_API_KEY,
        },
      });

      if (response.data[tokenId]) {
        const price = response.data[tokenId].usd;
        this.cache.set(tokenId, { price, timestamp: Date.now() });
        return price;
      }
      
      return null;
    } catch (error) {
      logger.error(`CoinGecko API error for ${tokenId}:`, error);
      return null;
    }
  }

  async getTrending(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/trending`, {
        params: {
          x_cg_demo_api_key: config.COINGECKO_API_KEY,
        },
      });
      return response.data.coins || [];
    } catch (error) {
      logger.error('CoinGecko Trending API error:', error);
      return [];
    }
  }

  async getTokenPriceByAddress(platformId: string, contractAddress: string): Promise<number | null> {
    const cacheKey = `${platformId}:${contractAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    try {
      const response = await axios.get<CoinGeckoPrice>(`${this.baseUrl}/simple/token_price/${platformId}`, {
        params: {
          contract_addresses: contractAddress,
          vs_currencies: 'usd',
          x_cg_demo_api_key: config.COINGECKO_API_KEY,
        },
      });

      // The response format for token_price is { [contract_address]: { usd: number } }
      // Note: contract address in response is usually lowercased
      const lowerAddress = contractAddress.toLowerCase();
      if (response.data[lowerAddress]) {
        const price = response.data[lowerAddress].usd;
        this.cache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      }
      
      return null;
    } catch (error) {
      logger.error(`CoinGecko Token Price API error for ${platformId}:${contractAddress}:`, error);
      return null;
    }
  }
}

export const coingeckoService = new CoinGeckoService();
