import axios from 'axios';
import { logger } from '../utils/logger.util';

interface FuturesSymbol {
  symbol: string;
  pair: string;
  contractType: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

interface ExchangeInfoResponse {
  symbols: FuturesSymbol[];
}

class BinanceService {
  private baseUrl = 'https://fapi.binance.com';
  private futuresSymbolsCache: Set<string> = new Set();
  private cacheTimestamp: number = 0;
  private CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for futures symbols

  /**
   * Fetch all available USDT perpetual futures symbols from Binance
   */
  async getFuturesSymbols(): Promise<Set<string>> {
    // Return cached result if still valid
    if (this.futuresSymbolsCache.size > 0 && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.futuresSymbolsCache;
    }

    try {
      const response = await axios.get<ExchangeInfoResponse>(`${this.baseUrl}/fapi/v1/exchangeInfo`, {
        timeout: 10000,
      });

      const symbols = new Set<string>();
      
      for (const symbol of response.data.symbols) {
        // Only include USDT perpetual contracts that are trading
        if (
          symbol.contractType === 'PERPETUAL' &&
          symbol.quoteAsset === 'USDT' &&
          symbol.status === 'TRADING'
        ) {
          // Store the base asset (e.g., BTC from BTCUSDT)
          symbols.add(symbol.baseAsset.toUpperCase());
        }
      }

      this.futuresSymbolsCache = symbols;
      this.cacheTimestamp = Date.now();
      logger.info(`Binance Futures: Loaded ${symbols.size} tradeable USDT perpetual symbols`);
      
      return symbols;
    } catch (error) {
      logger.error('Binance Futures: Failed to fetch exchange info', error);
      // Return cached data if available, even if stale
      if (this.futuresSymbolsCache.size > 0) {
        logger.warn('Binance Futures: Using stale cache');
        return this.futuresSymbolsCache;
      }
      // Return a default set of major coins if API fails and no cache
      return new Set([
        'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK',
        'MATIC', 'UNI', 'ATOM', 'LTC', 'FIL', 'APT', 'ARB', 'OP', 'INJ', 'SUI',
        'NEAR', 'TIA', 'SEI', 'JTO', 'PYTH', 'JUP', 'WIF', 'BONK', 'PEPE', 'SHIB',
        'FLOKI', 'ORDI', 'WLD', 'BLUR', 'MEME', 'AAVE', 'MKR', 'CRV', 'LDO', 'SNX'
      ]);
    }
  }

  /**
   * Check if a token is available on Binance Futures
   */
  async isAvailableOnFutures(symbol: string): Promise<boolean> {
    const symbols = await this.getFuturesSymbols();
    return symbols.has(symbol.toUpperCase());
  }

  /**
   * Filter a list of tokens to only include those available on Binance Futures
   */
  async filterFuturesAvailable<T extends { symbol: string }>(candidates: T[]): Promise<T[]> {
    const symbols = await this.getFuturesSymbols();
    const filtered = candidates.filter(c => symbols.has(c.symbol.toUpperCase()));
    
    logger.info(`Binance Futures Filter: ${filtered.length}/${candidates.length} candidates available on futures`);
    
    return filtered;
  }
}

export const binanceService = new BinanceService();
