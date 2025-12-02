/**
 * Test Chart Vision
 * 
 * This script tests the complete flow:
 * 1. Fetch real OHLCV data from Binance
 * 2. Generate a professional PNG chart image (TradingView-style)
 * 3. Save it to disk
 * 4. Send the image to the LLM to verify it can "see" and analyze it
 */

import * as fs from 'fs';
import * as path from 'path';
import { binanceService } from '../src/services/binance.service';
import { proChartService } from '../src/services/pro-chart.service';
import { config } from '../src/config/env.config';

// Simple direct OpenAI API call with vision support
async function callVisionLLM(base64Image: string, prompt: string): Promise<string> {
  const response = await fetch(`${config.OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response';
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🖼️  PROFESSIONAL CHART VISION TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const symbol = 'ETH';
  const outputDir = path.join(__dirname, '..', 'output');
  const outputPath = path.join(outputDir, `${symbol}_pro_chart.png`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Step 1: Fetch OHLCV data from Binance (more candles for better context)
  console.log(`📊 Step 1: Fetching ${symbol} OHLCV data from Binance...`);
  const ohlcv = await binanceService.getOHLCV(symbol, '4h', 14); // 2 weeks of 4h candles
  
  if (ohlcv.length === 0) {
    console.error('❌ Failed to fetch OHLCV data from Binance');
    process.exit(1);
  }
  
  console.log(`   ✅ Fetched ${ohlcv.length} candles`);
  console.log(`   📈 Price range: $${Math.min(...ohlcv.map(c => c.low)).toFixed(2)} - $${Math.max(...ohlcv.map(c => c.high)).toFixed(2)}`);
  console.log(`   📅 Time range: ${new Date(ohlcv[0].timestamp).toLocaleString()} - ${new Date(ohlcv[ohlcv.length - 1].timestamp).toLocaleString()}\n`);

  // Step 2: Generate Professional PNG chart
  console.log('🎨 Step 2: Generating TradingView-style PNG chart...');
  const chartResult = await proChartService.generateCandlestickChart(ohlcv, symbol, {
    width: 1800,
    height: 1000,
    title: `${symbol}/USDT · 4H`,
    showVolume: true,
    showSMA: [20, 50],
    showBollingerBands: true,
    showGrid: true,
    darkMode: true,
  });

  console.log(`   ✅ Chart generated: ${chartResult.width}x${chartResult.height} pixels`);
  console.log(`   📦 Base64 size: ${(chartResult.base64.length / 1024).toFixed(1)} KB\n`);

  // Step 3: Save to disk
  console.log('💾 Step 3: Saving chart to disk...');
  const imageBuffer = Buffer.from(chartResult.base64, 'base64');
  fs.writeFileSync(outputPath, imageBuffer);
  console.log(`   ✅ Saved to: ${outputPath}`);
  console.log(`   📁 File size: ${(imageBuffer.length / 1024).toFixed(1)} KB\n`);

  // Step 4: Send to LLM for vision analysis
  console.log('🤖 Step 4: Sending chart to LLM for vision analysis...');
  console.log(`   Using model: ${config.OPENAI_MODEL}`);
  console.log(`   Base URL: ${config.OPENAI_BASE_URL}\n`);

  const analysisPrompt = `You are a professional crypto trader analyzing an ${symbol}/USDT 4-hour chart.

The chart includes:
- Candlestick price action
- SMA 20 (blue line) and SMA 50 (orange line)
- Bollinger Bands (blue shaded area)
- Volume bars at the bottom
- OHLC values displayed

Please provide a detailed technical analysis:

1. **Current Trend**: Is the price in an uptrend, downtrend, or ranging? What's the short-term vs medium-term trend?

2. **Price Levels**: 
   - What is the current price shown?
   - Key support levels you can identify
   - Key resistance levels you can identify

3. **Moving Average Analysis**:
   - Where is price relative to SMA 20 and SMA 50?
   - Are the MAs bullish (20 > 50) or bearish (20 < 50)?
   - Any MA crossovers visible?

4. **Bollinger Bands Analysis**:
   - Is price near the upper, middle, or lower band?
   - Are the bands expanding (volatility increasing) or contracting?

5. **Volume Analysis**:
   - Is volume increasing or decreasing?
   - Any notable volume spikes?

6. **Chart Patterns**: Any patterns visible (double top/bottom, head & shoulders, wedges, flags, etc.)?

7. **Trading Recommendation**: Based on this analysis, would you go LONG, SHORT, or WAIT?

Be specific and reference actual price levels you see on the chart.`;

  try {
    const startTime = Date.now();
    const analysis = await callVisionLLM(chartResult.base64, analysisPrompt);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📝 LLM PROFESSIONAL CHART ANALYSIS');
    console.log(`⏱️  Response time: ${elapsed}s`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(analysis);
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE - LLM successfully analyzed the pro chart!');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('❌ LLM Vision Error:', error.message);
    console.log('\n💡 The chart was still generated and saved. Check the output file.');
    console.log(`   ${outputPath}\n`);
  }
}

main().catch(console.error);
