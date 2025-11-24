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

    // Sort by liquidity to get the most relevant pair (with null safety)
    const bestPair = pairs.sort((a, b) => {
      const liquidityA = a.liquidity?.usd || 0;
      const liquidityB = b.liquidity?.usd || 0;
      return liquidityB - liquidityA;
    })[0];

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

  /**
   * Get OHLCV-like data from DexScreener pair data
   * Note: DexScreener doesn't provide historical OHLCV via API, 
   * so we construct approximate data from current pair information
   */
  async getOHLCVData(address: string, chain?: string): Promise<Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      const query = chain ? `${address} ${chain}` : address;
      const pairs = await this.searchPairs(query);
      
      if (!pairs || pairs.length === 0) return [];
      
      // Sort by liquidity with null safety
      const bestPair = pairs.sort((a, b) => {
        const liquidityA = a.liquidity?.usd || 0;
        const liquidityB = b.liquidity?.usd || 0;
        return liquidityB - liquidityA;
      })[0];
      
      const currentPrice = parseFloat(bestPair.priceUsd);
      if (!currentPrice || isNaN(currentPrice)) return [];
      
      // Construct approximate OHLCV from price change data
      const now = Date.now();
      const approximateOHLCV: Array<{
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }> = [];
      
      // 24h data point
      const change24h = (bestPair.priceChange?.h24 || 0) / 100;
      const price24hAgo = currentPrice / (1 + change24h);
      
      approximateOHLCV.push({
        timestamp: now - (24 * 60 * 60 * 1000),
        open: price24hAgo,
        high: Math.max(price24hAgo, currentPrice),
        low: Math.min(price24hAgo, currentPrice),
        close: price24hAgo,
        volume: bestPair.volume?.h24 || 0
      });
      
      // 6h data point
      const change6h = (bestPair.priceChange?.h6 || 0) / 100;
      const price6hAgo = currentPrice / (1 + change6h);
      
      approximateOHLCV.push({
        timestamp: now - (6 * 60 * 60 * 1000),
        open: price6hAgo,
        high: Math.max(price6hAgo, currentPrice),
        low: Math.min(price6hAgo, currentPrice),
        close: price6hAgo,
        volume: bestPair.volume?.h6 || 0
      });
      
      // 1h data point
      const change1h = (bestPair.priceChange?.h1 || 0) / 100;
      const price1hAgo = currentPrice / (1 + change1h);
      
      approximateOHLCV.push({
        timestamp: now - (60 * 60 * 1000),
        open: price1hAgo,
        high: Math.max(price1hAgo, currentPrice),
        low: Math.min(price1hAgo, currentPrice),
        close: price1hAgo,
        volume: bestPair.volume?.h1 || 0
      });
      
      // Current
      approximateOHLCV.push({
        timestamp: now,
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: bestPair.volume?.m5 || 0
      });
      
      return approximateOHLCV;
    } catch (error) {
      logger.error(`DexScreener OHLCV error for ${address}:`, error);
      return [];
    }
  }
}

export const dexScreenerService = new DexScreenerService();
