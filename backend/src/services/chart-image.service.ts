import axios from 'axios';
import { logger } from '../utils/logger.util';

interface ChartImageOptions {
  symbol: string;
  interval?: '1' | '5' | '15' | '30' | '60' | '120' | '240' | 'D' | 'W' | 'M';
  theme?: 'light' | 'dark';
  width?: number;
  height?: number;
  studies?: string[];
  hideVolume?: boolean;
}

/**
 * Chart Image Service
 * Generates chart images for visual analysis by AI agents
 * Uses TradingView's Mini Chart Widget screenshot capability
 */
class ChartImageService {
  
  // Map common symbols to TradingView format
  private symbolMap: { [key: string]: string } = {
    'BTC': 'BINANCE:BTCUSDT',
    'ETH': 'BINANCE:ETHUSDT',
    'SOL': 'BINANCE:SOLUSDT',
    'BNB': 'BINANCE:BNBUSDT',
    'ADA': 'BINANCE:ADAUSDT',
    'AVAX': 'BINANCE:AVAXUSDT',
    'DOGE': 'BINANCE:DOGEUSDT',
    'DOT': 'BINANCE:DOTUSDT',
    'MATIC': 'BINANCE:MATICUSDT',
    'LINK': 'BINANCE:LINKUSDT',
    'UNI': 'BINANCE:UNIUSDT',
    'ATOM': 'BINANCE:ATOMUSDT',
    'LTC': 'BINANCE:LTCUSDT',
    'ETC': 'BINANCE:ETCUSDT',
    'XLM': 'BINANCE:XLMUSDT',
    'ALGO': 'BINANCE:ALGOUSDT',
    'FIL': 'BINANCE:FILUSDT',
    'NEAR': 'BINANCE:NEARUSDT',
    'APT': 'BINANCE:APTUSDT',
    'ARB': 'BINANCE:ARBUSDT',
    'OP': 'BINANCE:OPUSDT',
    'SUI': 'BINANCE:SUIUSDT',
    'TIA': 'BINANCE:TIAUSDT',
    'INJ': 'BINANCE:INJUSDT',
    'SEI': 'BINANCE:SEIUSDT',
    'RUNE': 'BINANCE:RUNEUSDT',
    'FET': 'BINANCE:FETUSDT',
    'RENDER': 'BINANCE:RENDERUSDT',
    'TAO': 'BINANCE:TAOUSDT',
    'WIF': 'BINANCE:WIFUSDT',
    'PEPE': 'BINANCE:PEPEUSDT',
    'SHIB': 'BINANCE:SHIBUSDT',
    'WLD': 'BINANCE:WLDUSDT',
    'IMX': 'BINANCE:IMXUSDT',
    'GALA': 'BINANCE:GALAUSDT',
    'SAND': 'BINANCE:SANDUSDT',
    'APE': 'BINANCE:APEUSDT',
    'AAVE': 'BINANCE:AAVEUSDT',
    'SNX': 'BINANCE:SNXUSDT',
    'LDO': 'BINANCE:LDOUSDT',
    'PENDLE': 'BINANCE:PENDLEUSDT',
    'DYDX': 'BINANCE:DYDXUSDT',
    'JUP': 'BINANCE:JUPUSDT',
    'PYTH': 'BINANCE:PYTHUSDT',
    'STX': 'BINANCE:STXUSDT',
    'KAS': 'BINANCE:KASUSDT',
    'TON': 'BINANCE:TONUSDT',
    'ORDI': 'BINANCE:ORDIUSDT',
    'ICP': 'BINANCE:ICPUSDT',
    'XRP': 'BINANCE:XRPUSDT',
    'TRX': 'BINANCE:TRXUSDT',
    'ONDO': 'BINANCE:ONDOUSDT',
    'GRASS': 'BINANCE:GRASSUSDT',
    'TRUMP': 'BINANCE:TRUMPUSDT',
    'MOVE': 'BINANCE:MOVEUSDT',
  };

  /**
   * Get TradingView symbol format
   */
  getTradingViewSymbol(symbol: string): string | null {
    return this.symbolMap[symbol.toUpperCase()] || null;
  }

  /**
   * Generate a TradingView chart URL that can be rendered as an image
   * Uses TradingView's Mini Chart Widget
   */
  getChartUrl(options: ChartImageOptions): string {
    const tvSymbol = this.getTradingViewSymbol(options.symbol);
    if (!tvSymbol) {
      logger.warn(`ChartImage: No TradingView mapping for ${options.symbol}`);
      return '';
    }

    const interval = options.interval || '60'; // Default 1h
    const theme = options.theme || 'dark';
    const width = options.width || 800;
    const height = options.height || 400;

    // TradingView Mini Chart Widget URL
    // This generates an embeddable chart that could be screenshot
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: interval,
      theme: theme,
      style: '1', // Candlestick
      locale: 'en',
      toolbar_bg: theme === 'dark' ? '#1a1a2e' : '#ffffff',
      enable_publishing: 'false',
      hide_top_toolbar: 'false',
      hide_legend: 'false',
      save_image: 'false',
      container_id: 'tradingview_chart',
      width: width.toString(),
      height: height.toString(),
    });

    return `https://www.tradingview.com/widgetembed/?${params.toString()}`;
  }

  /**
   * Generate chart analysis description from OHLCV data
   * This provides a text-based "visual" description the LLM can use
   */
  generateChartDescription(ohlcv: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>): string {
    if (ohlcv.length < 20) {
      return 'Insufficient data for chart analysis';
    }

    const recent = ohlcv.slice(-50); // Last 50 candles
    const latest = recent[recent.length - 1];
    const oldest = recent[0];
    
    // Calculate trend
    const priceChange = ((latest.close - oldest.close) / oldest.close) * 100;
    const trend = priceChange > 2 ? 'UPTREND' : priceChange < -2 ? 'DOWNTREND' : 'SIDEWAYS';
    
    // Find swing highs and lows
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    const swingHigh = Math.max(...highs);
    const swingLow = Math.min(...lows);
    const range = ((swingHigh - swingLow) / swingLow) * 100;
    
    // Count green vs red candles
    const greenCandles = recent.filter(c => c.close > c.open).length;
    const redCandles = recent.filter(c => c.close < c.open).length;
    const momentum = greenCandles > redCandles * 1.5 ? 'BULLISH' : 
                     redCandles > greenCandles * 1.5 ? 'BEARISH' : 'MIXED';
    
    // Detect potential patterns
    const patterns: string[] = [];
    
    // Higher highs / Higher lows (uptrend structure)
    const recentHighs = recent.slice(-10).map(c => c.high);
    const recentLows = recent.slice(-10).map(c => c.low);
    const higherHighs = recentHighs.every((h, i) => i === 0 || h >= recentHighs[i-1] * 0.99);
    const higherLows = recentLows.every((l, i) => i === 0 || l >= recentLows[i-1] * 0.99);
    const lowerHighs = recentHighs.every((h, i) => i === 0 || h <= recentHighs[i-1] * 1.01);
    const lowerLows = recentLows.every((l, i) => i === 0 || l <= recentLows[i-1] * 1.01);
    
    if (higherHighs && higherLows) patterns.push('HIGHER HIGHS + HIGHER LOWS (bullish structure)');
    if (lowerHighs && lowerLows) patterns.push('LOWER HIGHS + LOWER LOWS (bearish structure)');
    
    // Detect consolidation (low range)
    const last10Range = (Math.max(...recent.slice(-10).map(c => c.high)) - 
                        Math.min(...recent.slice(-10).map(c => c.low))) / latest.close * 100;
    if (last10Range < 3) patterns.push('CONSOLIDATION (tight range, potential breakout)');
    
    // Volume analysis
    const avgVolume = recent.slice(0, -5).reduce((sum, c) => sum + c.volume, 0) / (recent.length - 5);
    const recentVolume = recent.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5;
    const volumeChange = avgVolume > 0 ? ((recentVolume - avgVolume) / avgVolume * 100) : 0;
    const volumeDesc = volumeChange > 50 ? 'INCREASING significantly' : 
                       volumeChange > 20 ? 'INCREASING' :
                       volumeChange < -30 ? 'DECREASING' : 'STABLE';
    
    // Detect candle patterns in last 3 candles
    const last3 = recent.slice(-3);
    const lastCandle = last3[2];
    const prevCandle = last3[1];
    
    // Engulfing patterns
    if (lastCandle.close > lastCandle.open && // Green candle
        prevCandle.close < prevCandle.open && // Previous red
        lastCandle.open < prevCandle.close && // Opens below prev close
        lastCandle.close > prevCandle.open) { // Closes above prev open
      patterns.push('BULLISH ENGULFING (reversal signal)');
    }
    if (lastCandle.close < lastCandle.open && // Red candle
        prevCandle.close > prevCandle.open && // Previous green
        lastCandle.open > prevCandle.close && // Opens above prev close
        lastCandle.close < prevCandle.open) { // Closes below prev open
      patterns.push('BEARISH ENGULFING (reversal signal)');
    }
    
    // Doji detection (small body relative to range)
    const lastBody = Math.abs(lastCandle.close - lastCandle.open);
    const lastRange = lastCandle.high - lastCandle.low;
    if (lastRange > 0 && lastBody / lastRange < 0.1) {
      patterns.push('DOJI (indecision, potential reversal)');
    }
    
    // Hammer/Shooting star
    const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
    const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
    if (lowerWick > lastBody * 2 && upperWick < lastBody * 0.5 && trend === 'DOWNTREND') {
      patterns.push('HAMMER (bullish reversal after downtrend)');
    }
    if (upperWick > lastBody * 2 && lowerWick < lastBody * 0.5 && trend === 'UPTREND') {
      patterns.push('SHOOTING STAR (bearish reversal after uptrend)');
    }
    
    // Support/Resistance levels
    const priceLevel = latest.close;
    const nearSwingHigh = (swingHigh - priceLevel) / priceLevel * 100;
    const nearSwingLow = (priceLevel - swingLow) / priceLevel * 100;
    
    let pricePosition = '';
    if (nearSwingHigh < 2) pricePosition = 'AT RESISTANCE (swing high)';
    else if (nearSwingLow < 2) pricePosition = 'AT SUPPORT (swing low)';
    else if (nearSwingHigh < nearSwingLow) pricePosition = 'CLOSER TO RESISTANCE';
    else pricePosition = 'CLOSER TO SUPPORT';

    return `
📊 CHART VISUAL ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━

🔹 TREND: ${trend} (${priceChange.toFixed(2)}% over 50 candles)
🔹 MOMENTUM: ${momentum} (${greenCandles} green vs ${redCandles} red candles)
🔹 VOLATILITY: ${range.toFixed(2)}% range (swing high to low)
🔹 VOLUME: ${volumeDesc} (${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(0)}% vs average)

📍 PRICE POSITION:
   Current: $${latest.close.toFixed(4)}
   Swing High: $${swingHigh.toFixed(4)} (${nearSwingHigh.toFixed(1)}% above)
   Swing Low: $${swingLow.toFixed(4)} (${nearSwingLow.toFixed(1)}% below)
   Position: ${pricePosition}

🔍 DETECTED PATTERNS:
${patterns.length > 0 ? patterns.map(p => `   • ${p}`).join('\n') : '   • No significant patterns detected'}

⚠️ KEY OBSERVATIONS:
${trend === 'UPTREND' && momentum === 'BULLISH' ? '   • Trend and momentum aligned BULLISH - consider LONG' : ''}
${trend === 'DOWNTREND' && momentum === 'BEARISH' ? '   • Trend and momentum aligned BEARISH - consider SHORT' : ''}
${trend === 'SIDEWAYS' ? '   • RANGING market - wait for breakout or trade range' : ''}
${momentum !== (trend === 'UPTREND' ? 'BULLISH' : trend === 'DOWNTREND' ? 'BEARISH' : 'MIXED') ? '   • DIVERGENCE between trend and momentum - potential reversal' : ''}
${patterns.some(p => p.includes('ENGULFING') || p.includes('HAMMER') || p.includes('SHOOTING STAR')) ? '   • REVERSAL CANDLE detected - watch for confirmation' : ''}
${volumeChange > 50 ? '   • HIGH VOLUME - move is significant' : volumeChange < -30 ? '   • LOW VOLUME - move may be weak' : ''}
`.trim();
  }

  /**
   * Check if we can generate chart for a symbol
   */
  hasSymbol(symbol: string): boolean {
    return !!this.symbolMap[symbol.toUpperCase()];
  }
}

export const chartImageService = new ChartImageService();
