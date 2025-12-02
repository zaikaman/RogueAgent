/**
 * Simple Vision Test
 * 
 * This test creates a minimal agent (no output schema) just to test
 * if images are being properly sent via the ADK FullMessage format.
 */

import dotenv from 'dotenv';
dotenv.config();

import { AgentBuilder } from '@iqai/adk';
import { llm } from '../src/config/llm.config';
import { binanceService } from '../src/services/binance.service';
import { chartImageService } from '../src/services/chart-image.service';
import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
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

async function main() {
  header('🔬 SIMPLE VISION TEST (No Output Schema)');
  
  const testSymbol = 'BTC';
  
  try {
    // Step 1: Get chart data
    header('📊 Step 1: Fetching OHLCV Data');
    log(`Fetching BTC 1h candles...`, colors.yellow);
    const ohlcv = await binanceService.getOHLCV(testSymbol, '1h', 50);
    log(`✅ Got ${ohlcv.length} candles`, colors.green);
    
    // Step 2: Generate chart image
    header('🎨 Step 2: Generating Chart');
    const chartResult = await chartImageService.generateCandlestickChart(
      ohlcv, testSymbol, { title: `${testSymbol}/USDT Test`, darkMode: true }
    );
    log(`✅ Chart: ${chartResult.width}x${chartResult.height}, ${Math.round(chartResult.base64.length * 0.75 / 1024)}KB`, colors.green);
    
    // Save for reference
    const outputPath = path.join(__dirname, '..', 'output', `${testSymbol}_simple_test.png`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(chartResult.base64, 'base64'));
    log(`   Saved: ${outputPath}`, colors.cyan);
    
    // Step 3: Create simple agent WITHOUT output schema
    header('🤖 Step 3: Creating Simple Vision Agent');
    log('Building agent without output schema...', colors.yellow);
    
    const { runner } = await AgentBuilder
      .create('vision_test_agent')
      .withModel(llm)
      .withDescription('A simple agent to test vision capabilities')
      .withInstruction(`You are a vision test agent. Your only job is to describe what you see in images.
When you receive an image, describe it in detail. If you cannot see any image, say "NO IMAGE VISIBLE".`)
      .build();
    
    log('✅ Agent built', colors.green);
    
    // Step 4: Build FullMessage with inlineData
    header('📦 Step 4: Building FullMessage');
    
    const promptText = `Look at this chart image and answer:
1. Can you see a chart/image? (Yes/No)
2. What cryptocurrency is shown?
3. Is the overall trend up or down?
4. Describe the price action briefly.

If you cannot see any image, just say "NO IMAGE VISIBLE".`;
    
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
    
    log(`✅ FullMessage ready:`, colors.green);
    log(`   - Part 0: text (${promptText.length} chars)`, colors.cyan);
    log(`   - Part 1: inlineData (image/png, ${chartResult.base64.length} chars base64)`, colors.cyan);
    
    // Step 5: Send to agent
    header('📤 Step 5: Sending to Agent');
    log('Calling runner.ask(fullMessage)...', colors.yellow);
    log('(Watch for customFetch logs below)\n', colors.cyan);
    
    const startTime = Date.now();
    const response = await runner.ask(fullMessage as any);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Step 6: Show result
    header('📋 Step 6: Response');
    log(`Received in ${duration}s\n`, colors.cyan);
    
    console.log('─'.repeat(70));
    console.log(response);
    console.log('─'.repeat(70));
    
    // Verdict
    header('📊 VERDICT');
    const respUpper = (response || '').toString().toUpperCase();
    
    if (respUpper.includes('NO IMAGE VISIBLE') || respUpper.includes('CANNOT SEE') || respUpper.includes("CAN'T SEE")) {
      log('❌ FAILED - Model cannot see the image', colors.red);
      log('\nThe inlineData is NOT being sent properly.', colors.red);
      log('Check llm.config.ts customFetch for image handling.', colors.yellow);
    } else if (respUpper.includes('YES') || respUpper.includes('BTC') || respUpper.includes('BITCOIN') || respUpper.includes('CHART') || respUpper.includes('CANDLE')) {
      log('✅ SUCCESS - Model can see the chart!', colors.green);
      log('\nVision integration is working correctly.', colors.green);
    } else {
      log('⚠️ UNCERTAIN - Review response above', colors.yellow);
    }
    
    console.log();
    
  } catch (error: any) {
    header('❌ ERROR');
    console.error(colors.red + error.message + colors.reset);
    console.error(error.stack);
  }
}

main().catch(console.error);
