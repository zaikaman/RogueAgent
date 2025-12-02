import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.util';

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartImageResult {
  base64: string;
  mimeType: 'image/png';
  width: number;
  height: number;
}

interface ChartOptions {
  width?: number;
  height?: number;
  title?: string;
  showVolume?: boolean;
  showSMA?: number[];  // e.g., [20, 50] for 20 and 50 period SMAs
  darkMode?: boolean;
}

/**
 * Chart Image Service
 * Generates ACTUAL PNG chart images from OHLCV data using Chart.js
 * These images can be sent to vision-capable LLMs for visual analysis
 */
class ChartImageService {
  private chartJSNodeCanvas: ChartJSNodeCanvas;
  private defaultWidth = 1200;
  private defaultHeight = 600;

  constructor() {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: this.defaultWidth,
      height: this.defaultHeight,
      backgroundColour: '#0d1117', // Dark background
    });
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: number[], period: number): (number | null)[] {
    const sma: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  }

  /**
   * Generate a candlestick-style chart as PNG image
   * Returns base64 encoded image that can be sent to LLMs
   */
  async generateCandlestickChart(
    ohlcv: OHLCVData[],
    symbol: string,
    options: ChartOptions = {}
  ): Promise<ChartImageResult> {
    const {
      width = this.defaultWidth,
      height = this.defaultHeight,
      title = `${symbol} Price Chart`,
      showVolume = true,
      showSMA = [20, 50],
      darkMode = true,
    } = options;

    // Create canvas with specified dimensions
    const canvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: darkMode ? '#0d1117' : '#ffffff',
    });

    // Prepare data
    const labels = ohlcv.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    const closes = ohlcv.map(d => d.close);
    const highs = ohlcv.map(d => d.high);
    const lows = ohlcv.map(d => d.low);
    const opens = ohlcv.map(d => d.open);
    const volumes = ohlcv.map(d => d.volume);

    // Calculate price range for proper scaling
    const minPrice = Math.min(...lows) * 0.995;
    const maxPrice = Math.max(...highs) * 1.005;

    // Colors based on candle direction
    const candleColors = ohlcv.map(d => d.close >= d.open ? '#00ff88' : '#ff4444');
    const volumeColors = ohlcv.map(d => d.close >= d.open ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)');

    // Build datasets
    const datasets: any[] = [];

    // High-Low range as a bar (simulating wicks)
    datasets.push({
      label: 'High-Low Range',
      data: ohlcv.map((d, i) => ({
        x: i,
        y: [d.low, d.high],
      })),
      type: 'bar',
      backgroundColor: candleColors.map(c => c.replace(')', ', 0.3)').replace('rgb', 'rgba').replace('#00ff88', 'rgba(0, 255, 136, 0.3)').replace('#ff4444', 'rgba(255, 68, 68, 0.3)')),
      borderColor: candleColors,
      borderWidth: 1,
      barThickness: 2,
      yAxisID: 'y',
    });

    // Open-Close as thicker bars (simulating candle bodies)
    datasets.push({
      label: 'Candle Body',
      data: ohlcv.map(d => Math.abs(d.close - d.open)),
      type: 'bar',
      backgroundColor: candleColors,
      borderColor: candleColors,
      borderWidth: 1,
      barThickness: 8,
      yAxisID: 'y',
    });

    // Close price as line (main price line)
    datasets.push({
      label: 'Close',
      data: closes,
      type: 'line',
      borderColor: '#58a6ff',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
      yAxisID: 'y',
    });

    // High prices (dashed line)
    datasets.push({
      label: 'High',
      data: highs,
      type: 'line',
      borderColor: 'rgba(0, 255, 136, 0.5)',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0.1,
      yAxisID: 'y',
    });

    // Low prices (dashed line)
    datasets.push({
      label: 'Low',
      data: lows,
      type: 'line',
      borderColor: 'rgba(255, 68, 68, 0.5)',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0.1,
      yAxisID: 'y',
    });

    // Add SMAs
    const smaColors = ['#ffa500', '#ff00ff', '#00ffff'];
    showSMA.forEach((period, idx) => {
      const smaData = this.calculateSMA(closes, period);
      datasets.push({
        label: `SMA ${period}`,
        data: smaData,
        type: 'line',
        borderColor: smaColors[idx % smaColors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        yAxisID: 'y',
      });
    });

    // Volume bars (if enabled)
    if (showVolume) {
      const maxVolume = Math.max(...volumes);
      const scaledVolumes = volumes.map(v => minPrice + (v / maxVolume) * (maxPrice - minPrice) * 0.2);
      datasets.push({
        label: 'Volume',
        data: scaledVolumes,
        type: 'bar',
        backgroundColor: volumeColors,
        borderColor: volumeColors,
        borderWidth: 0,
        barThickness: 4,
        yAxisID: 'y',
      });
    }

    const textColor = darkMode ? '#c9d1d9' : '#24292f';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            color: textColor,
            font: {
              size: 18,
              weight: 'bold',
            },
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              filter: (item: any) => !['High-Low Range', 'Candle Body', 'Volume', 'High', 'Low'].includes(item.text),
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              maxRotation: 45,
              minRotation: 45,
              maxTicksLimit: 15,
            },
          },
          y: {
            display: true,
            position: 'right',
            min: minPrice,
            max: maxPrice,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              callback: (value: any) => {
                if (typeof value === 'number') {
                  return value < 1 ? value.toFixed(6) : value.toFixed(2);
                }
                return value;
              },
            },
          },
        },
      },
    };

    try {
      const buffer = await canvas.renderToBuffer(configuration);
      const base64 = buffer.toString('base64');

      logger.info(`ChartImage: Generated ${width}x${height} PNG for ${symbol} (${ohlcv.length} candles)`);

      return {
        base64,
        mimeType: 'image/png',
        width,
        height,
      };
    } catch (error) {
      logger.error('ChartImage: Failed to generate chart', error);
      throw error;
    }
  }

  /**
   * Generate a simple price line chart
   */
  async generatePriceChart(
    ohlcv: OHLCVData[],
    symbol: string,
    options: ChartOptions = {}
  ): Promise<ChartImageResult> {
    const {
      width = this.defaultWidth,
      height = this.defaultHeight,
      title = `${symbol} Price Chart`,
      darkMode = true,
    } = options;

    const canvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: darkMode ? '#0d1117' : '#ffffff',
    });

    const labels = ohlcv.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
      });
    });

    const closes = ohlcv.map(d => d.close);
    const priceChange = closes[closes.length - 1] - closes[0];
    const lineColor = priceChange >= 0 ? '#00ff88' : '#ff4444';
    const fillColor = priceChange >= 0 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)';

    const textColor = darkMode ? '#c9d1d9' : '#24292f';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Price',
          data: closes,
          borderColor: lineColor,
          backgroundColor: fillColor,
          borderWidth: 2,
          fill: true,
          pointRadius: 0,
          tension: 0.2,
        }],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            color: textColor,
            font: {
              size: 18,
              weight: 'bold',
            },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              maxRotation: 45,
              minRotation: 45,
              maxTicksLimit: 15,
            },
          },
          y: {
            display: true,
            position: 'right',
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              callback: (value: any) => {
                if (typeof value === 'number') {
                  return value < 1 ? value.toFixed(6) : value.toFixed(2);
                }
                return value;
              },
            },
          },
        },
      },
    };

    try {
      const buffer = await canvas.renderToBuffer(configuration);
      const base64 = buffer.toString('base64');

      return {
        base64,
        mimeType: 'image/png',
        width,
        height,
      };
    } catch (error) {
      logger.error('ChartImage: Failed to generate price chart', error);
      throw error;
    }
  }

  /**
   * Save chart image to file
   */
  async saveToFile(
    result: ChartImageResult,
    filePath: string
  ): Promise<string> {
    const buffer = Buffer.from(result.base64, 'base64');
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, buffer);
    logger.info(`ChartImage: Saved to ${filePath}`);
    return filePath;
  }

  /**
   * Generate chart analysis description from OHLCV data
   * This provides a text-based "visual" description the LLM can use
   * alongside the actual image
   */
  generateChartDescription(ohlcv: OHLCVData[]): string {
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
}

export const chartImageService = new ChartImageService();
