import { createCanvas, CanvasRenderingContext2D, Canvas } from 'canvas';
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
  showSMA?: number[];
  showEMA?: number[];
  showBollingerBands?: boolean;
  showGrid?: boolean;
  darkMode?: boolean;
}

// TradingView-inspired color palette
const COLORS = {
  // Background & Grid
  bg: '#131722',
  bgLight: '#1e222d',
  grid: '#363c4e',
  gridLight: '#2a2e39',
  
  // Candles
  bullish: '#26a69a',
  bullishWick: '#26a69a',
  bearish: '#ef5350',
  bearishWick: '#ef5350',
  
  // Volume
  volumeBull: 'rgba(38, 166, 154, 0.5)',
  volumeBear: 'rgba(239, 83, 80, 0.5)',
  
  // Indicators
  sma20: '#2962ff',
  sma50: '#ff6d00',
  sma200: '#ab47bc',
  ema: '#00bcd4',
  bbUpper: 'rgba(33, 150, 243, 0.6)',
  bbLower: 'rgba(33, 150, 243, 0.6)',
  bbMiddle: 'rgba(33, 150, 243, 0.8)',
  bbFill: 'rgba(33, 150, 243, 0.1)',
  
  // Text & Labels
  text: '#d1d4dc',
  textMuted: '#787b86',
  textBright: '#ffffff',
  
  // Price labels
  priceLabel: '#2962ff',
  priceLabelText: '#ffffff',
};

/**
 * Professional Chart Service
 * Generates TradingView-quality candlestick charts using Canvas API
 */
class ProChartService {
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
   * Calculate Exponential Moving Average
   */
  private calculateEMA(data: number[], period: number): (number | null)[] {
    const ema: (number | null)[] = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ema.push(null);
      } else if (i === period - 1) {
        const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        ema.push(sum / period);
      } else {
        const prevEma = ema[i - 1];
        if (prevEma !== null) {
          ema.push((data[i] - prevEma) * multiplier + prevEma);
        } else {
          ema.push(null);
        }
      }
    }
    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2): {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  } {
    const middle = this.calculateSMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        
        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
      }
    }

    return { upper, middle, lower };
  }

  /**
   * Format price for display
   */
  private formatPrice(price: number): string {
    if (price >= 10000) return price.toFixed(0);
    if (price >= 1000) return price.toFixed(1);
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  }

  /**
   * Format timestamp for x-axis label
   */
  private formatTime(timestamp: number, showDate: boolean = true): string {
    const date = new Date(timestamp);
    if (showDate) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Generate professional candlestick chart
   */
  async generateCandlestickChart(
    ohlcv: OHLCVData[],
    symbol: string,
    options: ChartOptions = {}
  ): Promise<ChartImageResult> {
    const {
      width = 1600,
      height = 900,
      title = `${symbol}/USDT`,
      showVolume = true,
      showSMA = [20, 50],
      showEMA = [],
      showBollingerBands = false,
      showGrid = true,
      darkMode = true,
    } = options;

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Chart dimensions
    const padding = { top: 60, right: 100, bottom: 80, left: 20 };
    const volumeHeight = showVolume ? 100 : 0;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom - volumeHeight - 20;

    // Calculate price range
    const prices = ohlcv.flatMap(d => [d.high, d.low]);
    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;

    // Calculate volume range
    const volumes = ohlcv.map(d => d.volume);
    const maxVolume = Math.max(...volumes);

    // Candle dimensions
    const candleWidth = Math.max(3, Math.floor((chartWidth / ohlcv.length) * 0.7));
    const candleSpacing = chartWidth / ohlcv.length;
    const wickWidth = Math.max(1, Math.floor(candleWidth / 4));

    // Helper functions
    const priceToY = (price: number): number => {
      return padding.top + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
    };

    const indexToX = (index: number): number => {
      return padding.left + candleSpacing * index + candleSpacing / 2;
    };

    const volumeToY = (volume: number): number => {
      const volumeAreaTop = height - padding.bottom - volumeHeight;
      return volumeAreaTop + volumeHeight - (volume / maxVolume) * volumeHeight;
    };

    // ═══════════════════════════════════════════════════════════════
    // DRAW BACKGROUND
    // ═══════════════════════════════════════════════════════════════
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // ═══════════════════════════════════════════════════════════════
    // DRAW GRID
    // ═══════════════════════════════════════════════════════════════
    if (showGrid) {
      ctx.strokeStyle = COLORS.gridLight;
      ctx.lineWidth = 0.5;

      // Horizontal grid lines (price levels)
      const priceStep = this.calculateNiceStep(maxPrice - minPrice, 8);
      const startPrice = Math.ceil(minPrice / priceStep) * priceStep;
      
      for (let price = startPrice; price <= maxPrice; price += priceStep) {
        const y = priceToY(price);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Price labels
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(this.formatPrice(price), width - padding.right + 10, y + 4);
      }

      // Vertical grid lines (time)
      const timeStep = Math.max(1, Math.floor(ohlcv.length / 10));
      for (let i = 0; i < ohlcv.length; i += timeStep) {
        const x = indexToX(i);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW BOLLINGER BANDS (if enabled)
    // ═══════════════════════════════════════════════════════════════
    if (showBollingerBands) {
      const closes = ohlcv.map(d => d.close);
      const bb = this.calculateBollingerBands(closes, 20, 2);
      
      // Draw fill between bands
      ctx.fillStyle = COLORS.bbFill;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < ohlcv.length; i++) {
        if (bb.upper[i] !== null) {
          const x = indexToX(i);
          if (!started) {
            ctx.moveTo(x, priceToY(bb.upper[i]!));
            started = true;
          } else {
            ctx.lineTo(x, priceToY(bb.upper[i]!));
          }
        }
      }
      for (let i = ohlcv.length - 1; i >= 0; i--) {
        if (bb.lower[i] !== null) {
          ctx.lineTo(indexToX(i), priceToY(bb.lower[i]!));
        }
      }
      ctx.closePath();
      ctx.fill();

      // Draw upper band
      this.drawLine(ctx, ohlcv.map((_, i) => indexToX(i)), bb.upper.map(v => v !== null ? priceToY(v) : null), COLORS.bbUpper, 1);
      // Draw middle band
      this.drawLine(ctx, ohlcv.map((_, i) => indexToX(i)), bb.middle.map(v => v !== null ? priceToY(v) : null), COLORS.bbMiddle, 1);
      // Draw lower band
      this.drawLine(ctx, ohlcv.map((_, i) => indexToX(i)), bb.lower.map(v => v !== null ? priceToY(v) : null), COLORS.bbLower, 1);
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW VOLUME BARS
    // ═══════════════════════════════════════════════════════════════
    if (showVolume) {
      for (let i = 0; i < ohlcv.length; i++) {
        const candle = ohlcv[i];
        const x = indexToX(i);
        const y = volumeToY(candle.volume);
        const barHeight = height - padding.bottom - y;
        const isBullish = candle.close >= candle.open;

        ctx.fillStyle = isBullish ? COLORS.volumeBull : COLORS.volumeBear;
        ctx.fillRect(
          x - candleWidth / 2,
          y,
          candleWidth,
          barHeight
        );
      }

      // Volume separator line
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, height - padding.bottom - volumeHeight - 10);
      ctx.lineTo(width - padding.right, height - padding.bottom - volumeHeight - 10);
      ctx.stroke();
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW CANDLESTICKS
    // ═══════════════════════════════════════════════════════════════
    for (let i = 0; i < ohlcv.length; i++) {
      const candle = ohlcv[i];
      const x = indexToX(i);
      const isBullish = candle.close >= candle.open;
      
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);

      const bodyTop = Math.min(openY, closeY);
      const bodyBottom = Math.max(openY, closeY);
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      // Draw wick (high to low line)
      ctx.strokeStyle = isBullish ? COLORS.bullishWick : COLORS.bearishWick;
      ctx.lineWidth = wickWidth;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw candle body
      ctx.fillStyle = isBullish ? COLORS.bullish : COLORS.bearish;
      ctx.fillRect(
        x - candleWidth / 2,
        bodyTop,
        candleWidth,
        bodyHeight
      );

      // Draw body border for more definition
      ctx.strokeStyle = isBullish ? COLORS.bullish : COLORS.bearish;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        x - candleWidth / 2,
        bodyTop,
        candleWidth,
        bodyHeight
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW MOVING AVERAGES
    // ═══════════════════════════════════════════════════════════════
    const closes = ohlcv.map(d => d.close);
    const smaColors = [COLORS.sma20, COLORS.sma50, COLORS.sma200];

    showSMA.forEach((period, idx) => {
      const sma = this.calculateSMA(closes, period);
      const xValues = ohlcv.map((_, i) => indexToX(i));
      const yValues = sma.map(v => v !== null ? priceToY(v) : null);
      this.drawLine(ctx, xValues, yValues, smaColors[idx % smaColors.length], 2);
    });

    showEMA.forEach((period, idx) => {
      const ema = this.calculateEMA(closes, period);
      const xValues = ohlcv.map((_, i) => indexToX(i));
      const yValues = ema.map(v => v !== null ? priceToY(v) : null);
      this.drawLine(ctx, xValues, yValues, COLORS.ema, 2, [5, 3]);
    });

    // ═══════════════════════════════════════════════════════════════
    // DRAW CURRENT PRICE LINE & LABEL
    // ═══════════════════════════════════════════════════════════════
    const lastCandle = ohlcv[ohlcv.length - 1];
    const currentPrice = lastCandle.close;
    const currentY = priceToY(currentPrice);
    const isBullish = lastCandle.close >= lastCandle.open;

    // Dotted line
    ctx.strokeStyle = isBullish ? COLORS.bullish : COLORS.bearish;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label box
    const labelColor = isBullish ? COLORS.bullish : COLORS.bearish;
    const priceText = this.formatPrice(currentPrice);
    ctx.font = 'bold 12px Arial';
    const textWidth = ctx.measureText(priceText).width;
    const labelWidth = textWidth + 16;
    const labelHeight = 22;
    const labelX = width - padding.right + 5;
    const labelY = currentY - labelHeight / 2;

    ctx.fillStyle = labelColor;
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    
    ctx.fillStyle = COLORS.priceLabelText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, labelX + labelWidth / 2, currentY);

    // ═══════════════════════════════════════════════════════════════
    // DRAW X-AXIS LABELS (Time)
    // ═══════════════════════════════════════════════════════════════
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelStep = Math.max(1, Math.floor(ohlcv.length / 12));
    for (let i = 0; i < ohlcv.length; i += labelStep) {
      const x = indexToX(i);
      const timeLabel = this.formatTime(ohlcv[i].timestamp);
      ctx.fillText(timeLabel, x, height - padding.bottom + 10);
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW TITLE & LEGEND
    // ═══════════════════════════════════════════════════════════════
    // Title
    ctx.fillStyle = COLORS.textBright;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, padding.left + 10, 15);

    // Subtitle with current price
    const priceChange = ((currentPrice - ohlcv[0].open) / ohlcv[0].open * 100).toFixed(2);
    const priceChangeStr = `${this.formatPrice(currentPrice)} (${parseFloat(priceChange) >= 0 ? '+' : ''}${priceChange}%)`;
    ctx.fillStyle = parseFloat(priceChange) >= 0 ? COLORS.bullish : COLORS.bearish;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(priceChangeStr, padding.left + 10, 42);

    // Legend
    let legendX = padding.left + 250;
    const legendY = 20;

    // Draw MA legend
    showSMA.forEach((period, idx) => {
      ctx.fillStyle = smaColors[idx % smaColors.length];
      ctx.fillRect(legendX, legendY, 20, 3);
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px Arial';
      ctx.fillText(`SMA ${period}`, legendX + 25, legendY + 4);
      legendX += 80;
    });

    showEMA.forEach((period) => {
      ctx.fillStyle = COLORS.ema;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + 1);
      ctx.lineTo(legendX + 20, legendY + 1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px Arial';
      ctx.fillText(`EMA ${period}`, legendX + 25, legendY + 4);
      legendX += 80;
    });

    if (showBollingerBands) {
      ctx.fillStyle = COLORS.bbMiddle;
      ctx.fillRect(legendX, legendY - 4, 20, 10);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(legendX, legendY - 4, 20, 10);
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px Arial';
      ctx.fillText('BB(20,2)', legendX + 25, legendY + 4);
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW OHLC INFO BOX
    // ═══════════════════════════════════════════════════════════════
    const infoX = width - 280;
    const infoY = 15;
    
    ctx.fillStyle = 'rgba(19, 23, 34, 0.9)';
    ctx.fillRect(infoX - 10, infoY - 5, 180, 45);
    
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('O', infoX, infoY + 10);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(this.formatPrice(lastCandle.open), infoX + 15, infoY + 10);
    
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('H', infoX + 80, infoY + 10);
    ctx.fillStyle = COLORS.bullish;
    ctx.fillText(this.formatPrice(lastCandle.high), infoX + 95, infoY + 10);
    
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('L', infoX, infoY + 28);
    ctx.fillStyle = COLORS.bearish;
    ctx.fillText(this.formatPrice(lastCandle.low), infoX + 15, infoY + 28);
    
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('C', infoX + 80, infoY + 28);
    ctx.fillStyle = isBullish ? COLORS.bullish : COLORS.bearish;
    ctx.fillText(this.formatPrice(lastCandle.close), infoX + 95, infoY + 28);

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════
    const buffer = canvas.toBuffer('image/png');
    const base64 = buffer.toString('base64');

    logger.info(`ProChart: Generated ${width}x${height} PNG for ${symbol} (${ohlcv.length} candles)`);

    return {
      base64,
      mimeType: 'image/png',
      width,
      height,
    };
  }

  /**
   * Draw a line on the canvas
   */
  private drawLine(
    ctx: CanvasRenderingContext2D,
    xValues: number[],
    yValues: (number | null)[],
    color: string,
    lineWidth: number = 1,
    dash: number[] = []
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.beginPath();
    
    let started = false;
    for (let i = 0; i < xValues.length; i++) {
      if (yValues[i] !== null) {
        if (!started) {
          ctx.moveTo(xValues[i], yValues[i]!);
          started = true;
        } else {
          ctx.lineTo(xValues[i], yValues[i]!);
        }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Calculate a nice step value for grid lines
   */
  private calculateNiceStep(range: number, targetSteps: number): number {
    const roughStep = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;
    
    let niceStep: number;
    if (normalized <= 1) niceStep = 1;
    else if (normalized <= 2) niceStep = 2;
    else if (normalized <= 5) niceStep = 5;
    else niceStep = 10;
    
    return niceStep * magnitude;
  }

  /**
   * Save chart to file
   */
  async saveToFile(result: ChartImageResult, filePath: string): Promise<void> {
    const fs = await import('fs');
    const buffer = Buffer.from(result.base64, 'base64');
    fs.writeFileSync(filePath, buffer);
    logger.info(`ProChart: Saved to ${filePath}`);
  }
}

export const proChartService = new ProChartService();
