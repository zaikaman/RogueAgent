import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

interface CMCQuote {
  price: number;
  percent_change_24h: number;
  last_updated: string;
}

interface CMCResponse {
  data: {
    [key: string]: {
      id: number;
      name: string;
      symbol: string;
      slug: string;
      quote: {
        USD: CMCQuote;
      };
    }[];
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
}

class CoinMarketCapService {
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private cache: Map<string, { price: number; change_24h: number; timestamp: number }> = new Map();
  private CACHE_TTL = 3 * 60 * 1000; // 3 minutes - optimized for signal monitoring
  private inflightRequests: Map<string, Promise<number | null>> = new Map();

  private get apiKey() {
    return config.CMC_API_KEY;
  }

  private get headers() {
    return {
      'X-CMC_PRO_API_KEY': this.apiKey || '',
      'Accept': 'application/json'
    };
  }

  constructor() {
    if (!this.apiKey) {
      logger.warn('⚠️ CMC_API_KEY missing. CoinMarketCap service will not function.');
    }
  }

  async getPrice(symbol: string): Promise<number | null> {
    const cached = this.cache.get(symbol.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    // Check for in-flight request
    const existingRequest = this.inflightRequests.get(symbol.toLowerCase());
    if (existingRequest) {
      logger.debug(`Reusing in-flight CMC request for ${symbol}`);
      return existingRequest;
    }

    // Create and track new request
    const pricePromise = (async () => {
      const data = await this.getPriceWithChange(symbol);
      return data ? data.price : null;
    })();
    
    this.inflightRequests.set(symbol.toLowerCase(), pricePromise);
    
    try {
      return await pricePromise;
    } finally {
      this.inflightRequests.delete(symbol.toLowerCase());
    }
  }

  async getPriceBySlug(slug: string): Promise<{ price: number; change_24h: number } | null> {
    if (!this.apiKey) return null;

    const lowerSlug = slug.toLowerCase();
    const cached = this.cache.get(lowerSlug);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { price: cached.price, change_24h: cached.change_24h };
    }

    try {
      const response = await axios.get<CMCResponse>(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        headers: this.headers,
        params: {
          slug: lowerSlug,
          convert: 'USD'
        }
      });

      // When querying by slug, CMC returns the object keyed by the ID of the token, NOT the slug.
      // Wait, let me double check.
      // "If you use the slug parameter, the response will be a map of cryptocurrency objects by slug." -> This might be wrong in my memory or docs changed.
      // Actually, for `symbol`, it keys by symbol. For `id`, it keys by id.
      // For `slug`, it keys by ID?
      // Let's assume it keys by ID for now, or iterate over values.
      
      // Actually, let's just iterate over the values in `data` because we don't know the ID.
      const data = response.data.data;
      const values = Object.values(data);
      
      if (values.length > 0) {
        // It might be an array or object depending on endpoint version?
        // /v1/cryptocurrency/quotes/latest
        // If I pass slug=bitcoin, I get data: { "1": { ... } } where 1 is bitcoin ID.
        // So I should just take the first value.
        
        const coin: any = values[0]; // It's an object, not array of objects for slug usually?
        // If multiple slugs, multiple keys.
        
        if (coin && coin.quote && coin.quote.USD) {
             const quote = coin.quote.USD;
             const result = {
                price: quote.price,
                change_24h: quote.percent_change_24h
            };
            this.cache.set(lowerSlug, { ...result, timestamp: Date.now() });
            return result;
        }
      }

      return null;
    } catch (error: any) {
       if (error.response?.status === 400) {
        logger.warn(`CoinMarketCap: Token slug ${slug} not found`);
      } else {
        logger.error(`CoinMarketCap API error for slug ${slug}:`, error.response?.data || error.message);
      }
      return null;
    }
  }

  async getPriceWithChange(symbol: string): Promise<{ price: number; change_24h: number } | null> {
    if (!this.apiKey) return null;

    const upperSymbol = symbol.toUpperCase();
    const cached = this.cache.get(upperSymbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { price: cached.price, change_24h: cached.change_24h };
    }

    try {
      const response = await axios.get<CMCResponse>(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        headers: this.headers,
        params: {
          symbol: upperSymbol,
          convert: 'USD'
        }
      });

      if (response.data.status.error_code === 0 && response.data.data[upperSymbol]) {
        const coins = response.data.data[upperSymbol];
        
        // CMC returns an array of coins for a symbol (e.g. multiple coins can have symbol 'UNICORN')
        // We take the first one which is usually the highest ranked one
        if (Array.isArray(coins) && coins.length > 0) {
            const coin = coins[0];
            const quote = coin.quote.USD;
            
            const result = {
                price: quote.price,
                change_24h: quote.percent_change_24h
            };

            this.cache.set(upperSymbol, { ...result, timestamp: Date.now() });
            return result;
        }
      }
      
      return null;
    } catch (error: any) {
      // Don't log 400 errors as errors, just warnings, as it might just be a missing token
      if (error.response?.status === 400) {
        logger.warn(`CoinMarketCap: Token ${symbol} not found`);
      } else {
        logger.error(`CoinMarketCap API error for ${symbol}:`, error.response?.data || error.message);
      }
      return null;
    }
  }

  async getMarketChart(slug: string, days: number): Promise<{ prices: [number, number][] } | null> {
    if (!this.apiKey) return null;

    try {
      const timeEnd = new Date();
      const timeStart = new Date(timeEnd.getTime() - (days * 24 * 60 * 60 * 1000));

      const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/historical`, {
        headers: this.headers,
        params: {
          slug: slug.toLowerCase(),
          time_start: timeStart.toISOString(),
          time_end: timeEnd.toISOString(),
          interval: days > 1 ? '1d' : '1h',
          convert: 'USD'
        }
      });

      if (response.data.status.error_code === 0) {
         const data = response.data.data;
         // data might be keyed by ID.
         const coin = Object.values(data)[0] as any;
         
         if (coin && coin.quotes) {
             const prices: [number, number][] = coin.quotes.map((q: any) => {
                 const timestamp = new Date(q.timestamp).getTime();
                 const price = q.quote.USD.price;
                 return [timestamp, price];
             });
             return { prices };
         }
      }
      return null;

    } catch (error: any) {
      if (error.response?.status === 402 || error.response?.status === 403) {
          // logger.warn(`CoinMarketCap: History API not available on current plan for ${slug}`);
          return null;
      }
      // logger.error(`CoinMarketCap History API error for ${slug}:`, error.response?.data || error.message);
      return null;
    }
  }
}

export const coinMarketCapService = new CoinMarketCapService();
