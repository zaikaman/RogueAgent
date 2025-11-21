import axios from 'axios';
import { logger } from '../utils/logger.util';

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
}

export interface DexScreenerSearchResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

class DexScreenerService {
  private baseUrl = 'https://api.dexscreener.com/latest/dex';

  async searchPairs(query: string): Promise<DexScreenerPair[]> {
    try {
      const response = await axios.get<DexScreenerSearchResponse>(`${this.baseUrl}/search`, {
        params: { q: query }
      });
      return response.data.pairs || [];
    } catch (error) {
      logger.error(`DexScreener Search API error for ${query}:`, error);
      return [];
    }
  }

  async getTokenProfile(query: string): Promise<any | null> {
    // Try to find the best pair for the token
    const pairs = await this.searchPairs(query);
    if (!pairs || pairs.length === 0) return null;

    // Sort by liquidity to get the most relevant pair
    const bestPair = pairs.sort((a, b) => b.liquidity.usd - a.liquidity.usd)[0];

    // Map to CoinGecko-like structure for compatibility
    return {
      id: bestPair.baseToken.address,
      symbol: bestPair.baseToken.symbol.toLowerCase(),
      name: bestPair.baseToken.name,
      market_data: {
        current_price: { usd: parseFloat(bestPair.priceUsd) },
        market_cap: { usd: bestPair.marketCap },
        fully_diluted_valuation: { usd: bestPair.fdv },
        total_volume: { usd: bestPair.volume.h24 },
        price_change_percentage_24h: bestPair.priceChange.h24,
        circulating_supply: bestPair.marketCap && bestPair.priceUsd ? bestPair.marketCap / parseFloat(bestPair.priceUsd) : undefined,
      },
      description: {
        en: `Data provided by DexScreener. Pair: ${bestPair.baseToken.symbol}/${bestPair.quoteToken.symbol} on ${bestPair.dexId} (${bestPair.chainId}).`
      },
      links: {
        homepage: [bestPair.url],
        blockchain_site: [bestPair.url],
      }
    };
  }
}

export const dexScreenerService = new DexScreenerService();
