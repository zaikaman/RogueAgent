/**
 * Test ADK FullMessage Vision Integration
 * 
 * This script tests that the ADK's FullMessage format properly sends images
 * to the analyzer agent via inlineData.
 * 
 * Tests:
 * 1. Chart image generation from OHLCV data
 * 2. FullMessage construction with inlineData parts
 * 3. Analyzer agent receiving and processing the image via ADK
 */

import dotenv from 'dotenv';
dotenv.config();

import { AnalyzerAgent } from '../src/agents/analyzer.agent';
import { binanceService } from '../src/services/binance.service';
import { chartImageService } from '../src/services/chart-image.service';
import * as fs from 'fs';
import * as path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '═'.repeat(70));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('═'.repeat(70) + '\n');
}

async function testADKVision() {
  const startTime = Date.now();
  
  header('🧪 ADK FULLMESSAGE VISION INTEGRATION TEST');
  
  // Test parameters
  const testSymbol = 'ETH';
  const interval = '1h';
  const candleCount = 100;
  
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Fetch OHLCV Data
    // ═══════════════════════════════════════════════════════════════════════
    header('📊 STEP 1: Fetching OHLCV Data from Binance');
    
    log(`Fetching ${candleCount} ${interval} candles for ${testSymbol}...`, colors.yellow);
    const ohlcv = await binanceService.getOHLCV(testSymbol, interval as any, candleCount);
    
    if (!ohlcv || ohlcv.length < 20) {
      throw new Error(`Failed to fetch OHLCV data for ${testSymbol}`);
    }
    
    log(`✅ Fetched ${ohlcv.length} candles`, colors.green);
    log(`   First: ${new Date(ohlcv[0].timestamp).toISOString()}`, colors.cyan);
    log(`   Last:  ${new Date(ohlcv[ohlcv.length - 1].timestamp).toISOString()}`, colors.cyan);
    log(`   Current Price: $${ohlcv[ohlcv.length - 1].close.toFixed(2)}`, colors.cyan);
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Generate Chart Image
    // ═══════════════════════════════════════════════════════════════════════
    header('🎨 STEP 2: Generating Chart Image');
    
    log('Generating candlestick chart with SMA indicators...', colors.yellow);
    const chartResult = await chartImageService.generateCandlestickChart(
      ohlcv,
      testSymbol,
      {
        title: `${testSymbol}/USDT - ${interval} Chart (ADK Vision Test)`,
        showVolume: true,
        showSMA: [20, 50],
        darkMode: true,
        width: 1200,
        height: 600,
      }
    );
    
    log(`✅ Chart generated successfully`, colors.green);
    log(`   Dimensions: ${chartResult.width}x${chartResult.height}`, colors.cyan);
    log(`   MIME Type: ${chartResult.mimeType}`, colors.cyan);
    log(`   Base64 Length: ${chartResult.base64.length} characters`, colors.cyan);
    log(`   Estimated Size: ~${Math.round(chartResult.base64.length * 0.75 / 1024)} KB`, colors.cyan);
    
    // Save chart to disk for visual verification
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, `${testSymbol}_adk_vision_test.png`);
    fs.writeFileSync(outputPath, Buffer.from(chartResult.base64, 'base64'));
    log(`   Saved to: ${outputPath}`, colors.cyan);
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Build ADK FullMessage with inlineData
    // ═══════════════════════════════════════════════════════════════════════
    header('📦 STEP 3: Building ADK FullMessage');
    
    const promptText = `VISION TEST: Analyze this ${testSymbol}/USDT chart image.

FIRST, confirm you can see the chart by stating: "I CAN SEE THE CHART IMAGE"

Then describe:
1. Overall trend direction (uptrend/downtrend/sideways)
2. Price position relative to SMA lines (above/below/crossing)
3. Recent candlestick patterns visible
4. Volume trend (increasing/decreasing)
5. Any notable support/resistance levels visible

If you CANNOT see any chart image, say: "NO IMAGE VISIBLE"

Keep your response concise and factual based on what you observe in the chart.`;

    // Build FullMessage in ADK format with inlineData
    const fullMessage = {
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType: chartResult.mimeType,
            data: chartResult.base64,
          }
        }
      ]
    };
    
    log(`✅ FullMessage built in ADK format`, colors.green);
    log(`   Parts count: ${fullMessage.parts.length}`, colors.cyan);
    log(`   Part 0: { text: "${promptText.substring(0, 50)}..." }`, colors.cyan);
    log(`   Part 1: { inlineData: { mimeType: "${chartResult.mimeType}", data: "<base64...>" } }`, colors.cyan);
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Send to Analyzer Agent via ADK
    // ═══════════════════════════════════════════════════════════════════════
    header('🤖 STEP 4: Sending FullMessage to Analyzer Agent');
    
    log('Building Analyzer Agent...', colors.yellow);
    const { runner: analyzer } = await AnalyzerAgent.build();
    
    log('Calling analyzer.ask(fullMessage) with image...', colors.yellow);
    log('(Watch the console for customFetch logs showing image handling)\n', colors.cyan);
    
    const askStartTime = Date.now();
    
    // This is the key test - sending FullMessage with inlineData to the ADK
    const response = await analyzer.ask(fullMessage as any);
    
    const askDuration = ((Date.now() - askStartTime) / 1000).toFixed(2);
    
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Analyze Response
    // ═══════════════════════════════════════════════════════════════════════
    header('📋 STEP 5: Response Analysis');
    
    log(`Response received in ${askDuration}s`, colors.cyan);
    console.log();
    
    const responseStr = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
    
    // Check if the model confirmed seeing the image
    const responseUpper = responseStr.toUpperCase();
    const canSeeImage = responseUpper.includes('I CAN SEE THE CHART') || 
                        responseUpper.includes('I CAN SEE') ||
                        responseUpper.includes('LOOKING AT THE CHART') ||
                        responseUpper.includes('IN THE CHART') ||
                        responseUpper.includes('THE CHART SHOWS') ||
                        responseUpper.includes('FROM THE CHART');
    
    const noImageVisible = responseUpper.includes('NO IMAGE VISIBLE') ||
                          responseUpper.includes('CANNOT SEE') ||
                          responseUpper.includes("CAN'T SEE") ||
                          responseUpper.includes('NO CHART') ||
                          responseUpper.includes('IMAGE NOT');
    
    console.log('─'.repeat(70));
    log('MODEL RESPONSE:', colors.bright);
    console.log('─'.repeat(70));
    console.log(responseStr);
    console.log('─'.repeat(70));
    console.log();
    
    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    header('📊 TEST SUMMARY');
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    log(`Total test duration: ${totalDuration}s`, colors.cyan);
    console.log();
    
    log('Test Steps:', colors.bright);
    log(`  ✅ OHLCV data fetched (${ohlcv.length} candles)`, colors.green);
    log(`  ✅ Chart image generated (${Math.round(chartResult.base64.length * 0.75 / 1024)} KB)`, colors.green);
    log(`  ✅ FullMessage built with inlineData parts`, colors.green);
    log(`  ✅ Message sent to Analyzer via ADK runner.ask()`, colors.green);
    log(`  ✅ Response received in ${askDuration}s`, colors.green);
    
    console.log();
    log('Vision Integration Result:', colors.bright);
    
    if (noImageVisible) {
      log(`  ❌ FAILED - Model reported it cannot see the image`, colors.red);
      log(``, colors.reset);
      log(`  Troubleshooting:`, colors.yellow);
      log(`  1. Check customFetch in llm.config.ts handles inlineData`, colors.yellow);
      log(`  2. Verify the model supports vision (grok-4 should)`, colors.yellow);
      log(`  3. Check if image is being stripped from the request`, colors.yellow);
    } else if (canSeeImage) {
      log(`  ✅ SUCCESS - Model confirmed it can see the chart!`, colors.green);
      log(``, colors.reset);
      log(`  The ADK FullMessage → inlineData → image_url conversion is working.`, colors.green);
    } else {
      log(`  ⚠️ UNCERTAIN - Model didn't explicitly confirm or deny`, colors.yellow);
      log(``, colors.reset);
      log(`  Review the response above. If it describes chart details,`, colors.yellow);
      log(`  the vision is likely working. If generic, it may not be.`, colors.yellow);
    }
    
    console.log();
    log(`Chart saved for manual review: ${outputPath}`, colors.cyan);
    console.log();
    
  } catch (error: any) {
    header('❌ TEST FAILED');
    console.error(colors.red + 'Error: ' + error.message + colors.reset);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testADKVision().catch(console.error);
