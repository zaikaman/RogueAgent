
export class TechnicalAnalysis {
  static calculateSMA(data: number[], period: number): number[] {
    if (data.length < period) return [];
    const sma: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  static calculateEMA(data: number[], period: number): number[] {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const ema: number[] = [data[0]]; // Start with first price as initial EMA
    
    // Calculate initial SMA for the first period to be more accurate if needed, 
    // but standard EMA often starts with first price or SMA of first period.
    // Let's use SMA of first 'period' elements as the starting point for the rest.
    const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const result: number[] = [];
    
    // We need to align the result array with the input data or just return the latest values.
    // Usually indicators return an array corresponding to the input time series.
    // Let's do a simple loop.
    
    let currentEma = firstSMA;
    // We can't calculate EMA for the first 'period-1' points properly without history, 
    // but usually we just start calculating.
    
    // Let's use a standard implementation:
    // EMA_today = (Price_today * k) + (EMA_yesterday * (1-k))
    
    const emaArray: number[] = new Array(data.length).fill(0);
    
    // Initialize first valid EMA at index 'period - 1'
    emaArray[period - 1] = firstSMA;
    
    for (let i = period; i < data.length; i++) {
      emaArray[i] = (data[i] * k) + (emaArray[i - 1] * (1 - k));
    }
    
    // Return only the valid part, or all? Let's return all, but 0s for initial.
    // Or better, return the aligned array.
    return emaArray;
  }

  static calculateRSI(data: number[], period: number = 14): number[] {
    if (data.length < period + 1) return [];
    
    const changes = data.slice(1).map((price, i) => price - data[i]);
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? -c : 0);
    
    const rsi: number[] = new Array(data.length).fill(0);
    
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // First RSI
    let rs = avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + rs));
    
    for (let i = period + 1; i < data.length; i++) {
      const change = changes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      
      if (avgLoss === 0) {
        rsi[i] = 100;
      } else {
        rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }
    
    return rsi;
  }

  static calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number[], signal: number[], histogram: number[] } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    const macdLine: number[] = new Array(data.length).fill(0);
    
    for (let i = 0; i < data.length; i++) {
      if (i >= slowPeriod - 1) {
        macdLine[i] = fastEMA[i] - slowEMA[i];
      }
    }
    
    // Calculate Signal Line (EMA of MACD Line)
    // We need to pass the non-zero part of MACD line to EMA calculation?
    // Or just pass the whole thing. The EMA function handles the start index.
    // But our EMA function expects valid data from start.
    // Let's slice the valid MACD part.
    
    const validMacdStart = slowPeriod - 1;
    const validMacdData = macdLine.slice(validMacdStart);
    const signalLineValid = this.calculateEMA(validMacdData, signalPeriod);
    
    const signalLine: number[] = new Array(data.length).fill(0);
    // Map valid signal line back to original indices
    // signalLineValid starts at index 'signalPeriod - 1' relative to validMacdData
    // validMacdData starts at 'validMacdStart' relative to original
    
    for (let i = 0; i < signalLineValid.length; i++) {
        // The index in original array
        const originalIndex = validMacdStart + i;
        signalLine[originalIndex] = signalLineValid[i];
    }

    const histogram: number[] = new Array(data.length).fill(0);
    for(let i = 0; i < data.length; i++) {
        if (signalLine[i] !== 0 || i > validMacdStart + signalPeriod) { // Simple check
             histogram[i] = macdLine[i] - signalLine[i];
        }
    }

    return { macd: macdLine, signal: signalLine, histogram };
  }
}
