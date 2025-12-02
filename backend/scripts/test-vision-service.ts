/**
 * Test the vision-llm.service.ts with real chart data
 */

import dotenv from 'dotenv';
dotenv.config();

import { binanceService } from '../src/services/binance.service';
import { proChartService } from '../src/services/pro-chart.service';
import { callVisionLLM, createVisionMessage } from '../src/services/vision-llm.service';

async function test() {
  console.log('📊 Testing Vision LLM Service');
  console.log('=' .repeat(60));

  // Step 1: Get OHLCV data
  console.log('\n📈 Step 1: Fetching ETH OHLCV data...');
  const ohlcv = await binanceService.getOHLCV('ETH', '4h', 100);
  console.log(`✅ Fetched ${ohlcv.length} candles`);

  // Step 2: Generate chart image
  console.log('\n🎨 Step 2: Generating chart image...');
  const chartResult = await proChartService.generateCandlestickChart(ohlcv, 'ETH', {
    title: 'ETH/USDT 4H',
    width: 1200,
    height: 800,
    showVolume: true,
    showSMA: [20, 50],
    showBollingerBands: true,
    darkMode: true,
  });
  console.log(`✅ Chart generated: ${chartResult.base64.length} chars base64`);

  // Step 3: Call vision service
  console.log('\n🤖 Step 3: Calling vision LLM service...');
  const prompt = `Analyze this ETH/USDT 4H chart. Focus on:
1. Current trend direction
2. Key support/resistance levels
3. Moving average positions
4. Bollinger Band position
5. Volume analysis
6. Overall bias (bullish/bearish/neutral)

Be concise but detailed.`;

  const visionMessage = createVisionMessage(prompt, chartResult.base64, chartResult.mimeType);
  
  const startTime = Date.now();
  const response = await callVisionLLM([visionMessage], { maxTokens: 100000 });
  const elapsed = (Date.now() - startTime) / 1000;

  console.log(`✅ Response received in ${elapsed.toFixed(1)}s`);
  console.log('\n' + '='.repeat(60));
  console.log('VISION ANALYSIS:');
  console.log('='.repeat(60));
  console.log(response);
  console.log('='.repeat(60));
  
  console.log('\n✅ Test complete!');
}

test().catch(console.error);
