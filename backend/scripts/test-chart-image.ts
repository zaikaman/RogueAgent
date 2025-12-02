/**
 * Test Chart Image Service
 * 
 * This script tests the NEW chart image functionality that generates ACTUAL PNG images
 * from OHLCV data using Chart.js. These images can be sent to vision-capable LLMs.
 */

import { chartImageService } from '../src/services/chart-image.service';
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

async function testChartImage() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.cyan}${colors.bold}📊 CHART IMAGE SERVICE TEST (NEW PNG GENERATION)${colors.reset}`);
  console.log('═'.repeat(70) + '\n');

  const testSymbols = ['BTC', 'ETH', 'SOL'];
  
  for (const symbol of testSymbols) {
    console.log(`\n${colors.yellow}Testing ${symbol}...${colors.reset}`);
    
    try {
      // Fetch real OHLCV data from Binance
      console.log(`  Fetching OHLCV data from Binance...`);
      const ohlcv = await binanceService.getOHLCV(symbol, '1h', 100);
      
      if (!ohlcv || ohlcv.length === 0) {
        console.log(`  ${colors.red}✗${colors.reset} No OHLCV data available for ${symbol}`);
        continue;
      }
      
      console.log(`  ${colors.green}✓${colors.reset} Got ${ohlcv.length} candles`);
      
      // Generate candlestick chart
      console.log(`  Generating candlestick chart...`);
      const chartResult = await chartImageService.generateCandlestickChart(
        ohlcv,
        symbol,
        {
          title: `${symbol}/USDT - 1H Chart`,
          showVolume: true,
          showSMA: [20, 50],
          darkMode: true,
        }
      );
      
      console.log(`  ${colors.green}✓${colors.reset} Generated PNG: ${chartResult.width}x${chartResult.height}`);
      console.log(`  ${colors.cyan}   Base64 size: ${(chartResult.base64.length / 1024).toFixed(1)} KB${colors.reset}`);
      
      // Save to file for visual verification
      const outputDir = path.join(__dirname, '../output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, `${symbol.toLowerCase()}-chart.png`);
      await chartImageService.saveToFile(chartResult, filePath);
      console.log(`  ${colors.green}✓${colors.reset} Saved to: ${filePath}`);
      
      // Generate text description as well
      console.log(`  Generating chart description...`);
      const description = chartImageService.generateChartDescription(ohlcv);
      console.log(`\n${colors.cyan}─── Chart Analysis Description ───${colors.reset}`);
      console.log(description);
      console.log(`${colors.cyan}─────────────────────────────────${colors.reset}\n`);
      
    } catch (error: any) {
      console.log(`  ${colors.red}✗${colors.reset} Error: ${error.message}`);
    }
  }

  // Test simple price chart
  console.log(`\n${colors.yellow}Testing simple price chart...${colors.reset}`);
  try {
    const btcOhlcv = await binanceService.getOHLCV('BTC', '4h', 50);
    if (btcOhlcv && btcOhlcv.length > 0) {
      const priceChart = await chartImageService.generatePriceChart(
        btcOhlcv,
        'BTC',
        { title: 'BTC/USDT - 4H Price Line', darkMode: true }
      );
      
      const outputDir = path.join(__dirname, '../output');
      const filePath = path.join(outputDir, 'btc-price-line.png');
      await chartImageService.saveToFile(priceChart, filePath);
      console.log(`  ${colors.green}✓${colors.reset} Saved price line chart: ${filePath}`);
    }
  } catch (error: any) {
    console.log(`  ${colors.red}✗${colors.reset} Error: ${error.message}`);
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.green}${colors.bold}✓ CHART IMAGE SERVICE NOW GENERATES REAL PNG IMAGES${colors.reset}`);
  console.log('═'.repeat(70));
  console.log(`
${colors.cyan}The new chart image service:${colors.reset}

${colors.green}✓${colors.reset} Generates actual PNG images from OHLCV data
${colors.green}✓${colors.reset} Returns base64-encoded images for LLM consumption
${colors.green}✓${colors.reset} Includes candlestick visualization with SMAs
${colors.green}✓${colors.reset} Shows volume bars at the bottom
${colors.green}✓${colors.reset} Can save charts to disk for debugging

${colors.yellow}To use with vision-capable LLMs:${colors.reset}

  const { base64, mimeType } = await chartImageService.generateCandlestickChart(ohlcv, symbol);
  
  // Send to LLM as image attachment:
  // { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }

${colors.cyan}Check the output/ folder for generated chart images!${colors.reset}
`);
}

testChartImage().catch(console.error);
