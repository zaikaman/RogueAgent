import axios from 'axios';
import { logger } from '../utils/logger.util';
import { HYPERLIQUID_AVAILABLE_PERPS } from './hyperliquid.service';

interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
  isDelisted?: boolean;
}

interface MetaResponse {
  universe: AssetInfo[];
}

/**
 * Hyperliquid Futures Filter Service
 * Used to check if tokens are available on Hyperliquid perpetual futures
 */
class HyperliquidFuturesFilterService {
  private baseUrl = 'https://api.hyperliquid.xyz';
  private testnetBaseUrl = 'https://api.hyperliquid-testnet.xyz';
  private futuresSymbolsCache: Set<string> = new Set();
  private cacheTimestamp: number = 0;
  private CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for futures symbols
  private useTestnet = true; // Using testnet by default

  /**
   * Fetch all available perpetual futures symbols from Hyperliquid
   */
  async getFuturesSymbols(): Promise<Set<string>> {
    // Return cached result if still valid
    if (this.futuresSymbolsCache.size > 0 && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.futuresSymbolsCache;
    }

    try {
      const url = this.useTestnet ? this.testnetBaseUrl : this.baseUrl;
      const response = await axios.post<MetaResponse>(
        `${url}/info`,
        { type: 'meta' },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const symbols = new Set<string>();
      
      for (const asset of response.data.universe) {
        // Only include assets that are not delisted
        if (!asset.isDelisted) {
          // Store the base asset (remove -PERP suffix if present)
          const baseSymbol = asset.name.replace(/-PERP$/, '').toUpperCase();
          symbols.add(baseSymbol);
        }
      }

      this.futuresSymbolsCache = symbols;
      this.cacheTimestamp = Date.now();
      logger.info(`Hyperliquid Futures: Loaded ${symbols.size} tradeable perpetual symbols`);
      
      return symbols;
    } catch (error) {
      logger.error('Hyperliquid Futures: Failed to fetch metadata', error);
      // Return cached data if available, even if stale
      if (this.futuresSymbolsCache.size > 0) {
        logger.warn('Hyperliquid Futures: Using stale cache');
        return this.futuresSymbolsCache;
      }
      // Return the known Hyperliquid perpetual symbols as fallback
      logger.warn('Hyperliquid Futures: Using fallback symbol list');
      return new Set(HYPERLIQUID_AVAILABLE_PERPS);
    }
  }

  /**
   * Check if a token is available on Hyperliquid Futures
   */
  async isAvailableOnFutures(symbol: string): Promise<boolean> {
    const symbols = await this.getFuturesSymbols();
    return symbols.has(symbol.toUpperCase());
  }

  /**
   * Filter a list of tokens to only include those available on Hyperliquid Futures
   */
  async filterFuturesAvailable<T extends { symbol: string }>(candidates: T[]): Promise<T[]> {
    const symbols = await this.getFuturesSymbols();
    const filtered = candidates.filter(c => symbols.has(c.symbol.toUpperCase()));
    
    logger.info(`Hyperliquid Futures Filter: ${filtered.length}/${candidates.length} candidates available on futures`);
    
    return filtered;
  }
}

export const hyperliquidFuturesFilterService = new HyperliquidFuturesFilterService();

// Backwards compatibility export (deprecated - use hyperliquidFuturesFilterService)
export const binanceService = hyperliquidFuturesFilterService;
