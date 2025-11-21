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

  async getPrice(tokenId: string, retryWithSearch = true): Promise<number | null> {
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
      
      if (retryWithSearch) {
        const resolvedId = await this.searchCoin(tokenId);
        if (resolvedId) {
          return this.getPrice(resolvedId, false);
        }
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

  async getTopGainersLosers(): Promise<any> {
    try {
      // Note: This endpoint might require Pro API or specific parameters on public.
      // Public API doesn't have a direct "top gainers" endpoint easily accessible without parsing large lists.
      // However, we can use /coins/markets with order=price_change_percentage_24h_desc
      
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'price_change_percentage_24h_desc',
          per_page: 20,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h',
          x_cg_demo_api_key: config.COINGECKO_API_KEY,
        },
      });
      return response.data || [];
    } catch (error) {
      logger.error('CoinGecko Top Gainers API error:', error);
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

  async getCoinDetails(tokenId: string, retryWithSearch = true): Promise<any | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/${tokenId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: false,
          x_cg_demo_api_key: config.COINGECKO_API_KEY,
        },
      });
      return response.data;
    } catch (error: any) {
      if (retryWithSearch && error.response && error.response.status === 404) {
        logger.warn(`CoinGecko coin not found for ${tokenId}, trying search...`);
        const resolvedId = await this.searchCoin(tokenId);
        if (resolvedId) {
          logger.info(`Resolved ${tokenId} to ${resolvedId}`);
          return this.getCoinDetails(resolvedId, false);
        }
      }
      logger.error(`CoinGecko Coin Details API error for ${tokenId}:`, error);
      return null;
    }
  }

  async searchCoin(query: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query: query,
          x_cg_demo_api_key: config.COINGECKO_API_KEY,
        },
      });
      
      if (response.data.coins && response.data.coins.length > 0) {
        return response.data.coins[0].id;
      }
      return null;
    } catch (error) {
      logger.error(`CoinGecko Search API error for ${query}:`, error);
      return null;
    }
  }

  async getMarketChart(tokenId: string, days: number = 7, retryWithSearch = true): Promise<{ prices: [number, number][] } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/${tokenId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          x_cg_demo_api_key: config.COINGECKO_API_KEY,
        },
      });
      return response.data;
    } catch (error: any) {
      if (retryWithSearch && error.response && error.response.status === 404) {
        logger.warn(`CoinGecko Market Chart not found for ${tokenId}, trying search...`);
        const resolvedId = await this.searchCoin(tokenId);
        if (resolvedId) {
          return this.getMarketChart(resolvedId, days, false);
        }
      }

      if (error.response && error.response.status === 404) {
        logger.warn(`CoinGecko Market Chart not found for ${tokenId} (404)`);
      } else {
        logger.error(`CoinGecko Market Chart API error for ${tokenId}:`, error.message);
      }
      return null;
    }
  }
}

export const coingeckoService = new CoinGeckoService();
