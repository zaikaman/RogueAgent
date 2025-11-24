import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { dexScreenerService } from './dexscreener.service';

interface CoinGeckoPrice {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

class CoinGeckoService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private CACHE_TTL = 3 * 60 * 1000; // 3 minutes - optimized for signal monitoring
  private inflightRequests: Map<string, Promise<number | null>> = new Map();
  private currentKeyIndex = 0;
  private apiKeys: string[] = [];

  constructor() {
    // Initialize API keys array with round-robin rotation
    this.apiKeys = config.COINGECKO_API_KEYS && config.COINGECKO_API_KEYS.length > 0 
      ? config.COINGECKO_API_KEYS 
      : (config.COINGECKO_API_KEY ? [config.COINGECKO_API_KEY] : []);
    
    if (this.apiKeys.length > 0) {
      logger.info(`CoinGecko: Initialized with ${this.apiKeys.length} API key(s)`);
    }
  }

  private getNextApiKey(): string | undefined {
    if (this.apiKeys.length === 0) return undefined;
    
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  private mapChainToPlatformId(chain: string): string | null {
    const map: { [key: string]: string } = {
      'ethereum': 'ethereum',
      'eth': 'ethereum',
      'solana': 'solana',
      'sol': 'solana',
      'bsc': 'binance-smart-chain',
      'bnb': 'binance-smart-chain',
      'arbitrum': 'arbitrum-one',
      'arb': 'arbitrum-one',
      'optimism': 'optimistic-ethereum',
      'op': 'optimistic-ethereum',
      'polygon': 'polygon-pos',
      'matic': 'polygon-pos',
      'avalanche': 'avalanche',
      'avax': 'avalanche',
      'base': 'base',
      'zksync': 'zksync',
      'sui': 'sui',
      'aptos': 'aptos',
      'tron': 'tron',
    };
    return map[chain.toLowerCase()] || chain.toLowerCase();
  }

  async getPrice(tokenId: string): Promise<number | null> {
    const cached = this.cache.get(tokenId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    // Check for in-flight request to prevent duplicate API calls
    const existingRequest = this.inflightRequests.get(tokenId);
    if (existingRequest) {
      logger.debug(`Reusing in-flight CoinGecko request for ${tokenId}`);
      return existingRequest;
    }

    // Create and track new request
    const pricePromise = this.fetchPrice(tokenId);
    this.inflightRequests.set(tokenId, pricePromise);
    
    try {
      const price = await pricePromise;
      return price;
    } finally {
      this.inflightRequests.delete(tokenId);
    }
  }

  private async fetchPrice(tokenId: string): Promise<number | null> {
    try {
      const apiKey = this.getNextApiKey();
      const response = await axios.get<CoinGeckoPrice>(`${this.baseUrl}/simple/price`, {
        params: {
          ids: tokenId,
          vs_currencies: 'usd',
          include_24hr_change: true,
          x_cg_demo_api_key: apiKey,
        },
      });

      if (response.data[tokenId]) {
        const price = response.data[tokenId].usd;
        this.cache.set(tokenId, { price, timestamp: Date.now() });
        return price;
      }
      
      // Fallback to DexScreener only (no search fallback)
      const dexData = await dexScreenerService.getTokenProfile(tokenId);
      if (dexData && dexData.market_data && dexData.market_data.current_price) {
        const price = dexData.market_data.current_price.usd;
        this.cache.set(tokenId, { price, timestamp: Date.now() });
        return price;
      }

      return null;
    } catch (error) {
      logger.error(`CoinGecko API error for ${tokenId}:`, error);
      return null;
    }
  }

  async getBatchPrices(tokenIds: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const uniqueIds = [...new Set(tokenIds)];
    const toFetch: string[] = [];

    // Check cache first
    for (const id of uniqueIds) {
      const cached = this.cache.get(id);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        results.set(id, cached.price);
      } else {
        toFetch.push(id);
      }
    }

    if (toFetch.length === 0) {
      return results;
    }

    logger.info(`Batch fetching ${toFetch.length} CoinGecko prices (${results.size} from cache)`);

    // CoinGecko allows up to 250 IDs in a single request
    const BATCH_SIZE = 100; // Conservative batch size
    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      const batch = toFetch.slice(i, i + BATCH_SIZE);
      
      try {
        const apiKey = this.getNextApiKey();
        const response = await axios.get<CoinGeckoPrice>(`${this.baseUrl}/simple/price`, {
          params: {
            ids: batch.join(','),
            vs_currencies: 'usd',
            x_cg_demo_api_key: apiKey,
          },
        });

        for (const [id, data] of Object.entries(response.data)) {
          if (data && data.usd) {
            const price = data.usd;
            this.cache.set(id, { price, timestamp: Date.now() });
            results.set(id, price);
          }
        }
      } catch (error) {
        logger.error(`Error fetching batch prices for CoinGecko:`, error);
      }

      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < toFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return results;
  }

  async getPriceWithChange(tokenId: string): Promise<{ price: number; change_24h: number } | null> {
    try {
      const apiKey = this.getNextApiKey();
      const response = await axios.get<CoinGeckoPrice>(`${this.baseUrl}/simple/price`, {
        params: {
          ids: tokenId,
          vs_currencies: 'usd',
          include_24hr_change: true,
          x_cg_demo_api_key: apiKey,
        },
      });

      if (response.data[tokenId]) {
        return {
          price: response.data[tokenId].usd,
          change_24h: response.data[tokenId].usd_24h_change
        };
      }
      return null;
    } catch (error) {
      logger.error(`CoinGecko Price+Change API error for ${tokenId}:`, error);
      return null;
    }
  }

  async getTrending(): Promise<any[]> {
    try {
      const apiKey = this.getNextApiKey();
      const response = await axios.get(`${this.baseUrl}/search/trending`, {
        params: {
          x_cg_demo_api_key: apiKey,
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
      
      const apiKey = this.getNextApiKey();
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'price_change_percentage_24h_desc',
          per_page: 20,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h',
          x_cg_demo_api_key: apiKey,
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
      const apiKey = this.getNextApiKey();
      const response = await axios.get<CoinGeckoPrice>(`${this.baseUrl}/simple/token_price/${platformId}`, {
        params: {
          contract_addresses: contractAddress,
          vs_currencies: 'usd',
          x_cg_demo_api_key: apiKey,
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

  async getCoinDetails(tokenId: string): Promise<any | null> {
    try {
      const apiKey = this.getNextApiKey();
      const response = await axios.get(`${this.baseUrl}/coins/${tokenId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: false,
          x_cg_demo_api_key: apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        logger.warn(`CoinGecko coin not found for ${tokenId}, trying DexScreener fallback...`);
        // Fallback to DexScreener only (no search fallback)
        const dexData = await dexScreenerService.getTokenProfile(tokenId);
        if (dexData) {
          logger.info(`Found ${tokenId} on DexScreener`);
          return dexData;
        }
      }
      logger.error(`CoinGecko Coin Details API error for ${tokenId}:`, error);
      return null;
    }
  }

  async getPriceByAddress(chain: string, address: string): Promise<number | null> {
    const platformId = this.mapChainToPlatformId(chain);
    if (!platformId) return null;
    return this.getTokenPriceByAddress(platformId, address);
  }

  async getCoinDetailsByAddress(chain: string, address: string): Promise<any | null> {
    const platformId = this.mapChainToPlatformId(chain);
    if (!platformId) return null;

    try {
      const apiKey = this.getNextApiKey();
      const response = await axios.get(`${this.baseUrl}/coins/${platformId}/contract/${address}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: false,
          x_cg_demo_api_key: apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
      // logger.error(`CoinGecko Coin Details by Address API error for ${chain}:${address}:`, error.message);
      // Don't log error as it might just be not found
      return null;
    }
  }

  async searchCoin(query: string): Promise<string | null> {
    try {
      const apiKey = this.getNextApiKey();
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query: query,
          x_cg_demo_api_key: apiKey,
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

  async getMarketChart(tokenId: string, days: number = 7): Promise<{ prices: [number, number][] } | null> {
    try {
      const apiKey = this.getNextApiKey();
      const response = await axios.get(`${this.baseUrl}/coins/${tokenId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          x_cg_demo_api_key: apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
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
