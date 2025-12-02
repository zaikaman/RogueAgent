import axios from 'axios';
import { logger } from '../utils/logger.util';

interface BinanceKline {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Binance Public API Service
 * Provides real OHLCV data for major cryptocurrencies
 * No authentication required for public market data endpoints
 */
class BinanceService {
  private baseUrl = 'https://api.binance.com/api/v3';
  
  // Map common token symbols to Binance trading pairs (USDT pairs)
  private symbolMap: { [key: string]: string } = {
    'BTC': 'BTCUSDT',
    'ETH': 'ETHUSDT',
    'SOL': 'SOLUSDT',
    'BNB': 'BNBUSDT',
    'ADA': 'ADAUSDT',
    'AVAX': 'AVAXUSDT',
    'DOGE': 'DOGEUSDT',
    'DOT': 'DOTUSDT',
    'MATIC': 'MATICUSDT',
    'POL': 'POLUSDT',
    'LINK': 'LINKUSDT',
    'UNI': 'UNIUSDT',
    'ATOM': 'ATOMUSDT',
    'LTC': 'LTCUSDT',
    'ETC': 'ETCUSDT',
    'XLM': 'XLMUSDT',
    'ALGO': 'ALGOUSDT',
    'FIL': 'FILUSDT',
    'NEAR': 'NEARUSDT',
    'APT': 'APTUSDT',
    'ARB': 'ARBUSDT',
    'OP': 'OPUSDT',
    'SUI': 'SUIUSDT',
    'TIA': 'TIAUSDT',
    'INJ': 'INJUSDT',
    'SEI': 'SEIUSDT',
    'RUNE': 'RUNEUSDT',
    'FET': 'FETUSDT',
    'RENDER': 'RENDERUSDT',
    'TAO': 'TAOUSDT',
    'WIF': 'WIFUSDT',
    'PEPE': 'PEPEUSDT',
    'SHIB': 'SHIBUSDT',
    'BONK': 'BONKUSDT',
    'FLOKI': 'FLOKIUSDT',
    'WLD': 'WLDUSDT',
    'IMX': 'IMXUSDT',
    'GALA': 'GALAUSDT',
    'SAND': 'SANDUSDT',
    'APE': 'APEUSDT',
    'AAVE': 'AAVEUSDT',
    'SNX': 'SNXUSDT',
    'COMP': 'COMPUSDT',
    'LDO': 'LDOUSDT',
    'PENDLE': 'PENDLEUSDT',
    'DYDX': 'DYDXUSDT',
    'GMX': 'GMXUSDT',
    'JUP': 'JUPUSDT',
    'JTO': 'JTOUSDT',
    'PYTH': 'PYTHUSDT',
    'STX': 'STXUSDT',
    'KAS': 'KASUSDT',
    'TON': 'TONUSDT',
    'ORDI': 'ORDIUSDT',
    'ICP': 'ICPUSDT',
    'HBAR': 'HBARUSDT',
    'XRP': 'XRPUSDT',
    'TRX': 'TRXUSDT',
    'ONDO': 'ONDOUSDT',
    'EIGEN': 'EIGENUSDT',
    'MOVE': 'MOVEUSDT',
    'TRUMP': 'TRUMPUSDT',
    'GRASS': 'GRASSUSDT',
    'VIRTUAL': 'VIRTUALUSDT',
    'AI16Z': 'AI16ZUSDT',
    'FARTCOIN': 'FARTCOINUSDT',
    'POPCAT': 'POPCATUSDT',
    'MOODENG': 'MOODENGUSDT',
    'PNUT': 'PNUTUSDT',
    'GOAT': 'GOATUSDT',
  };

  /**
   * Check if we have a Binance pair for this symbol
   */
  hasSymbol(symbol: string): boolean {
    return !!this.symbolMap[symbol.toUpperCase()];
  }

  /**
   * Get real OHLCV data from Binance
   * @param symbol Token symbol (e.g., 'BTC', 'ETH', 'SOL')
   * @param interval Kline interval ('1h', '4h', '1d')
   * @param days Number of days of history
   */
  async getOHLCV(
    symbol: string,
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
    days: number = 30
  ): Promise<BinanceKline[]> {
    const binanceSymbol = this.symbolMap[symbol.toUpperCase()];
    
    if (!binanceSymbol) {
      logger.debug(`Binance: No mapping for symbol ${symbol}`);
      return [];
    }

    try {
      // Calculate limit based on interval and days
      // 1h = 24 candles/day, 4h = 6 candles/day, 1d = 1 candle/day
      const candlesPerDay = interval === '1h' ? 24 : interval === '4h' ? 6 : interval === '1d' ? 1 : 24;
      const limit = Math.min(days * candlesPerDay, 1000); // Binance max is 1000

      const response = await axios.get(`${this.baseUrl}/klines`, {
        params: {
          symbol: binanceSymbol,
          interval: interval,
          limit: limit
        },
        timeout: 10000
      });

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
      const klines: BinanceKline[] = response.data.map((k: any[]) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      logger.debug(`Binance: Fetched ${klines.length} candles for ${binanceSymbol}`);
      return klines;

    } catch (error: any) {
      if (error.response?.status === 400) {
        // Symbol doesn't exist on Binance
        logger.debug(`Binance: Symbol ${binanceSymbol} not found`);
      } else {
        logger.warn(`Binance API error for ${symbol}:`, error.message);
      }
      return [];
    }
  }

  /**
   * Get current price from Binance
   */
  async getPrice(symbol: string): Promise<number | null> {
    const binanceSymbol = this.symbolMap[symbol.toUpperCase()];
    
    if (!binanceSymbol) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/ticker/price`, {
        params: { symbol: binanceSymbol },
        timeout: 5000
      });

      return parseFloat(response.data.price);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get 24h ticker stats (volume, price change, etc.)
   */
  async get24hStats(symbol: string): Promise<{
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    quoteVolume: number;
    highPrice: number;
    lowPrice: number;
  } | null> {
    const binanceSymbol = this.symbolMap[symbol.toUpperCase()];
    
    if (!binanceSymbol) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/ticker/24hr`, {
        params: { symbol: binanceSymbol },
        timeout: 5000
      });

      return {
        priceChange: parseFloat(response.data.priceChange),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        volume: parseFloat(response.data.volume),
        quoteVolume: parseFloat(response.data.quoteVolume),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice)
      };
    } catch (error) {
      return null;
    }
  }
}

export const binanceService = new BinanceService();
