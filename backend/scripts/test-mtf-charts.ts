/**
 * Test Multi-Timeframe Chart Generation
 * 
 * Generates 3 chart images (4H, 1H, 15m) for a symbol and saves them to the output folder
 * This tests the improved chart clarity with more price levels on the Y-axis
 */

import { proChartService } from '../src/services/pro-chart.service';
import { binanceService } from '../src/services/binance.service';
import * as fs from 'fs';
import * as path from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Configuration
const SYMBOL = 'ETH'; // Change this to test different symbols
const TIMEFRAMES = ['4h', '1h', '15m'] as const;
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

async function generateMultiTimeframeCharts() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.cyan}${colors.bold}📊 MULTI-TIMEFRAME CHART TEST${colors.reset}`);
  console.log(`${colors.cyan}Testing improved chart clarity with more price levels${colors.reset}`);
  console.log('═'.repeat(70) + '\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`${colors.yellow}Symbol: ${SYMBOL}${colors.reset}`);
  console.log(`${colors.yellow}Timeframes: ${TIMEFRAMES.join(', ')}${colors.reset}`);
  console.log(`${colors.yellow}Output directory: ${OUTPUT_DIR}${colors.reset}\n`);

  for (const timeframe of TIMEFRAMES) {
    console.log(`\n${colors.cyan}━━━ Generating ${timeframe} chart ━━━${colors.reset}`);
    
    try {
      // Number of candles to display (keep it manageable for clarity)
      const candleCount = 100;
      
      // Fetch OHLCV data from Binance (fetch more, then slice to get most recent)
      console.log(`  Fetching candles from Binance...`);
      const allOhlcv = await binanceService.getOHLCV(SYMBOL, timeframe, 7); // 7 days of data
      
      if (!allOhlcv || allOhlcv.length === 0) {
        console.log(`  ${colors.red}✗${colors.reset} No OHLCV data available`);
        continue;
      }
      
      // Take only the last N candles for cleaner charts
      const ohlcv = allOhlcv.slice(-candleCount);
      console.log(`  ${colors.green}✓${colors.reset} Got ${allOhlcv.length} candles, using last ${ohlcv.length}`);
      
      // Get price range info
      const prices = ohlcv.flatMap(d => [d.high, d.low]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const currentPrice = ohlcv[ohlcv.length - 1].close;
      
      console.log(`  Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
      console.log(`  Current price: $${currentPrice.toFixed(2)}`);
      
      // Generate chart using proChartService
      console.log(`  Generating PNG chart...`);
      const chartResult = await proChartService.generateCandlestickChart(
        ohlcv,
        SYMBOL,
        {
          title: `${SYMBOL}/USDT - ${timeframe.toUpperCase()}`,
          showVolume: true,
          showSMA: [20, 50],
          showBollingerBands: true,
          width: 1600,
          height: 900,
        }
      );
      
      // Save to file
      const filename = `${SYMBOL}_${timeframe}_chart.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      await proChartService.saveToFile(chartResult, filepath);
      
      console.log(`  ${colors.green}✓${colors.reset} Saved: ${colors.bold}${filename}${colors.reset}`);
      console.log(`  Dimensions: ${chartResult.width}x${chartResult.height}`);
      
      // Calculate approximate file size from base64
      const fileSizeKB = Math.round((chartResult.base64.length * 3 / 4) / 1024);
      console.log(`  File size: ~${fileSizeKB} KB`);
      
    } catch (error) {
      console.log(`  ${colors.red}✗ Error:${colors.reset}`, error);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.green}${colors.bold}✓ Chart generation complete!${colors.reset}`);
  console.log(`${colors.cyan}Check the output folder: ${OUTPUT_DIR}${colors.reset}`);
  console.log('═'.repeat(70) + '\n');
  
  // List generated files
  console.log(`${colors.yellow}Generated files:${colors.reset}`);
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith(SYMBOL) && f.endsWith('.png'));
  files.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  📄 ${f} (${Math.round(stats.size / 1024)} KB)`);
  });
}

// Run the test
generateMultiTimeframeCharts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
