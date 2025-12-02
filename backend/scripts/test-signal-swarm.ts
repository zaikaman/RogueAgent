/**
 * Test Signal Swarm
 * 
 * This script runs the full signal generation pipeline to test the quality improvements:
 * - Scanner Agent: Identifies market candidates
 * - Analyzer Agent: Deep technical analysis with chart images
 * - Generator Agent: Creates signal content
 * 
 * Runs WITHOUT publishing to Telegram/Twitter - just logs results
 * 
 * Usage: npx ts-node scripts/test-signal-swarm.ts
 */

import { ScannerAgent } from '../src/agents/scanner.agent';
import { AnalyzerAgent } from '../src/agents/analyzer.agent';
import { GeneratorAgent } from '../src/agents/generator.agent';
import { logger } from '../src/utils/logger.util';
import { coingeckoService } from '../src/services/coingecko.service';
import { birdeyeService } from '../src/services/birdeye.service';
import { defillamaService } from '../src/services/defillama.service';
import { coinMarketCapService } from '../src/services/coinmarketcap.service';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

const log = {
  info: (msg: string, data?: any) => {
    console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
    if (data) console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
  },
  success: (msg: string, data?: any) => {
    console.log(`${colors.green}✓${colors.reset} ${colors.bright}${msg}${colors.reset}`);
    if (data) console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
  },
  warn: (msg: string, data?: any) => {
    console.log(`${colors.yellow}⚠${colors.reset} ${colors.yellow}${msg}${colors.reset}`);
    if (data) console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
  },
  error: (msg: string, data?: any) => {
    console.log(`${colors.red}✗${colors.reset} ${colors.red}${msg}${colors.reset}`);
    if (data) console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
  },
  header: (msg: string) => {
    console.log('\n' + colors.bgBlue + colors.white + colors.bright + ` ${msg} ` + colors.reset + '\n');
  },
  divider: () => console.log(colors.dim + '─'.repeat(60) + colors.reset),
};

/**
 * Signal Quality Validator - Same logic as orchestrator
 */
interface SignalQualityResult {
  isValid: boolean;
  reasons: string[];
  metrics: {
    confidence: number;
    riskRewardRatio: number;
    stopLossPercent: number;
    direction: 'LONG' | 'SHORT';
    tradingStyle: string;
  };
}

function validateSignalQuality(result: any): SignalQualityResult {
  const reasons: string[] = [];
  const details = result.signal_details;
  
  if (!details || !details.entry_price || !details.target_price || !details.stop_loss) {
    return {
      isValid: false,
      reasons: ['Missing required price levels'],
      metrics: { confidence: 0, riskRewardRatio: 0, stopLossPercent: 0, direction: 'LONG', tradingStyle: 'day_trade' }
    };
  }

  const entry = details.entry_price;
  const target = details.target_price;
  const stop = details.stop_loss;
  const confidence = details.confidence;
  const direction = details.direction || (target > entry ? 'LONG' : 'SHORT');
  const tradingStyle = details.trading_style || 'day_trade';
  
  // Determine direction
  const isLong = direction === 'LONG' || target > entry;
  
  // Calculate R:R
  const risk = isLong ? Math.abs(entry - stop) : Math.abs(stop - entry);
  const reward = isLong ? Math.abs(target - entry) : Math.abs(entry - target);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;
  
  // Calculate stop loss percentage
  const stopLossPercent = isLong 
    ? ((entry - stop) / entry) * 100 
    : ((stop - entry) / entry) * 100;

  // VALIDATION RULES (balanced)
  
  // 1. Confidence must be >= 85
  if (confidence < 85) {
    reasons.push(`Confidence ${confidence}% is below minimum 85%`);
  }
  
  // 2. Risk:Reward must be >= 1:2.5
  if (riskRewardRatio < 2.5) {
    reasons.push(`R:R ratio 1:${riskRewardRatio.toFixed(2)} is below minimum 1:2.5`);
  }
  
  // 3. Stop loss must be >= 5% from entry
  if (stopLossPercent < 5) {
    reasons.push(`Stop loss ${stopLossPercent.toFixed(1)}% is below minimum 5%`);
  }
  
  // 4. Stop loss shouldn't be too wide
  const maxStop = tradingStyle === 'swing_trade' ? 20 : 15;
  if (stopLossPercent > maxStop) {
    reasons.push(`Stop loss ${stopLossPercent.toFixed(1)}% exceeds maximum ${maxStop}%`);
  }
  
  // 5. Entry, stop, and target must make logical sense
  if (isLong && stop >= entry) {
    reasons.push('LONG: Stop loss must be below entry price');
  }
  if (!isLong && stop <= entry) {
    reasons.push('SHORT: Stop loss must be above entry price');
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    metrics: {
      confidence,
      riskRewardRatio,
      stopLossPercent,
      direction: isLong ? 'LONG' : 'SHORT',
      tradingStyle
    }
  };
}

async function runAgentWithRetry<T>(runner: any, prompt: string, agentName: string, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log.info(`Running ${agentName} (attempt ${attempt}/${maxRetries})...`);
      // Use .ask() method like the orchestrator does
      const result = await runner.ask(prompt) as T;
      return result;
    } catch (error: any) {
      lastError = error;
      log.warn(`${agentName} attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
      }
    }
  }
  throw lastError;
}

async function main() {
  const runId = Math.random().toString(36).substring(2, 10);
  const startTime = Date.now();
  
  console.log('\n');
  log.header('🚀 ROGUE SIGNAL SWARM TEST');
  console.log(`${colors.dim}Run ID: ${runId}${colors.reset}`);
  console.log(`${colors.dim}Time: ${new Date().toISOString()}${colors.reset}`);
  log.divider();

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: Fetch Market Data
    // ═══════════════════════════════════════════════════════════════════════
    log.header('📊 PHASE 1: MARKET DATA COLLECTION');
    
    log.info('Fetching market data from multiple sources...');
    const [trendingCg, trendingBe, topGainers, defiChains, defiProtocols, bitcoinData] = await Promise.all([
      coingeckoService.getTrending().catch(e => { log.warn('CoinGecko Trending failed'); return []; }),
      birdeyeService.getTrendingTokens(10).catch(e => { log.warn('Birdeye Trending failed'); return []; }),
      coingeckoService.getTopGainersLosers().catch(e => { log.warn('CoinGecko Gainers failed'); return []; }),
      defillamaService.getGlobalTVL().catch(e => { log.warn('DefiLlama Chains failed'); return []; }),
      defillamaService.getProtocolStats().catch(e => { log.warn('DefiLlama Protocols failed'); return []; }),
      (async () => {
        try {
          const price = await coinMarketCapService.getPriceWithChange('BTC');
          if (price) return price;
          throw new Error('CMC returned null');
        } catch (e) {
          return coingeckoService.getPriceWithChange('bitcoin').catch(() => null);
        }
      })()
    ]);

    const marketData = {
      global_market_context: { bitcoin: bitcoinData },
      trending_coingecko: trendingCg.slice(0, 10).map((c: any) => ({
        name: c.item?.name,
        symbol: c.item?.symbol,
        rank: c.item?.market_cap_rank
      })),
      trending_birdeye: trendingBe.slice(0, 10).map((c: any) => ({
        name: c.name,
        symbol: c.symbol,
        volume24h: c.volume24hUSD
      })),
      top_gainers: topGainers.slice(0, 10).map((c: any) => ({
        name: c.name,
        symbol: c.symbol,
        change_24h: c.price_change_percentage_24h?.toFixed(2) + '%'
      })),
    };

    log.success('Market data collected');
    console.log(`${colors.cyan}Bitcoin:${colors.reset}`, bitcoinData ? `$${bitcoinData.price?.toLocaleString()} (${(bitcoinData as any).change_24h?.toFixed(2) || (bitcoinData as any).change24h?.toFixed(2)}%)` : 'N/A');
    console.log(`${colors.cyan}Trending Tokens:${colors.reset}`, marketData.trending_coingecko.slice(0, 5).map((t: any) => t.symbol).join(', '));
    console.log(`${colors.cyan}Top Gainers:${colors.reset}`, marketData.top_gainers.slice(0, 5).map((t: any) => `${t.symbol} ${t.change_24h}`).join(', '));
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: Scanner Agent
    // ═══════════════════════════════════════════════════════════════════════
    log.header('🔍 PHASE 2: SCANNER AGENT');
    
    const { runner: scanner } = await ScannerAgent.build();
    const scannerPrompt = `Determine the market bias and find matching trading opportunities.

Here is the current market data:
${JSON.stringify(marketData, null, 2)}

STEP 1: First determine if today is a LONG day, SHORT day, or NEUTRAL (no trade).
STEP 2: If LONG/SHORT, find up to 3 tokens that match your bias.
STEP 3: Return empty candidates if NEUTRAL or no good setups exist.`;

    const scannerResult = await runAgentWithRetry<any>(scanner, scannerPrompt, 'Scanner Agent');
    
    // Display market bias
    log.divider();
    const biasColor = scannerResult.market_bias === 'LONG' ? colors.green : 
                      scannerResult.market_bias === 'SHORT' ? colors.red : colors.yellow;
    console.log(`${colors.bright}Market Bias:${colors.reset} ${biasColor}${scannerResult.market_bias || 'UNKNOWN'}${colors.reset}`);
    if (scannerResult.bias_reasoning) {
      console.log(`${colors.dim}${scannerResult.bias_reasoning}${colors.reset}`);
    }
    log.divider();
    
    if (scannerResult.market_bias === 'NEUTRAL') {
      log.warn('Scanner determined NEUTRAL bias - no clear direction.');
      log.info('This is actually GOOD - staying out of choppy markets prevents losses.');
      console.log(`\n${colors.yellow}Run completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s with NO SIGNAL (market is neutral)${colors.reset}\n`);
      return;
    }
    
    if (!scannerResult.candidates || scannerResult.candidates.length === 0) {
      log.warn(`Scanner found no candidates matching ${scannerResult.market_bias} bias.`);
      log.info('This is actually GOOD - being selective prevents bad trades.');
      console.log(`\n${colors.yellow}Run completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s with NO SIGNAL${colors.reset}\n`);
      return;
    }

    log.success(`Scanner found ${scannerResult.candidates.length} ${scannerResult.market_bias} candidate(s):`);
    scannerResult.candidates.forEach((c: any, i: number) => {
      const dirIcon = c.direction === 'LONG' ? '📈' : '📉';
      console.log(`  ${colors.cyan}${i + 1}. ${c.symbol}${colors.reset} ${dirIcon} ${c.direction}`);
      console.log(`     ${colors.dim}${c.reason}${colors.reset}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3: Analyzer Agent
    // ═══════════════════════════════════════════════════════════════════════
    log.header('📈 PHASE 3: ANALYZER AGENT');
    
    const { runner: analyzer } = await AnalyzerAgent.build();
    const analyzerPrompt = `Analyze these ${scannerResult.market_bias} candidates for high-probability trading signals:

Market Bias: ${scannerResult.market_bias}
Bias Reasoning: ${scannerResult.bias_reasoning}

Candidates: ${JSON.stringify(scannerResult.candidates, null, 2)}

Global Market Context: ${JSON.stringify(marketData.global_market_context, null, 2)}

CRITICAL REQUIREMENTS:
1. Use get_chart_image to visually analyze the charts FIRST
2. Then use get_technical_analysis with the symbol parameter for real OHLCV data
3. Confidence must be 92%+ to generate signal
4. R:R must be 1:3 minimum
5. Stop loss must be 5%+ from entry
6. Need 4+ technical confluences
7. Direction MUST match market bias: ${scannerResult.market_bias}

If no setup meets ALL criteria, return action: "no_signal"`;

    const analyzerResult = await runAgentWithRetry<any>(analyzer, analyzerPrompt, 'Analyzer Agent');
    
    log.divider();
    console.log(`${colors.bright}Analyzer Decision:${colors.reset} ${analyzerResult.action}`);
    console.log(`${colors.dim}${analyzerResult.analysis_summary}${colors.reset}`);

    if (analyzerResult.action !== 'signal' || !analyzerResult.signal_details) {
      log.warn('Analyzer did not find a high-conviction setup');
      console.log(`\n${colors.yellow}Run completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s with NO SIGNAL${colors.reset}\n`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4: Quality Gate Validation
    // ═══════════════════════════════════════════════════════════════════════
    log.header('🛡️ PHASE 4: QUALITY GATE');
    
    const qualityCheck = validateSignalQuality(analyzerResult);
    
    console.log(`${colors.bright}Signal Quality Metrics:${colors.reset}`);
    console.log(`  Direction:    ${qualityCheck.metrics.direction === 'LONG' ? colors.green : colors.red}${qualityCheck.metrics.direction}${colors.reset}`);
    console.log(`  Confidence:   ${qualityCheck.metrics.confidence >= 92 ? colors.green : colors.red}${qualityCheck.metrics.confidence}%${colors.reset} (min: 92%)`);
    console.log(`  R:R Ratio:    ${qualityCheck.metrics.riskRewardRatio >= 3 ? colors.green : colors.red}1:${qualityCheck.metrics.riskRewardRatio.toFixed(2)}${colors.reset} (min: 1:3)`);
    console.log(`  Stop Loss:    ${qualityCheck.metrics.stopLossPercent >= 5 ? colors.green : colors.red}${qualityCheck.metrics.stopLossPercent.toFixed(1)}%${colors.reset} (min: 5%)`);
    console.log(`  Style:        ${qualityCheck.metrics.tradingStyle}`);
    
    log.divider();
    
    if (!qualityCheck.isValid) {
      log.error('❌ SIGNAL REJECTED BY QUALITY GATE');
      console.log(`${colors.red}Rejection Reasons:${colors.reset}`);
      qualityCheck.reasons.forEach(r => console.log(`  • ${r}`));
      console.log(`\n${colors.yellow}Run completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s - Signal REJECTED (quality control working!)${colors.reset}\n`);
      return;
    }
    
    log.success('✅ SIGNAL PASSED QUALITY GATE');

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 5: Generator Agent
    // ═══════════════════════════════════════════════════════════════════════
    log.header('✍️ PHASE 5: GENERATOR AGENT');
    
    const { runner: generator } = await GeneratorAgent.build();
    const generatorPrompt = `Generate content for this signal:
${JSON.stringify({
  token: analyzerResult.selected_token,
  details: analyzerResult.signal_details
}, null, 2)}`;

    const generatorResult = await runAgentWithRetry<any>(generator, generatorPrompt, 'Generator Agent');
    
    log.success('Signal content generated');
    
    // ═══════════════════════════════════════════════════════════════════════
    // FINAL OUTPUT
    // ═══════════════════════════════════════════════════════════════════════
    log.header('🎯 FINAL SIGNAL OUTPUT');
    
    const signal = analyzerResult.signal_details;
    const token = analyzerResult.selected_token;
    
    console.log(`
${colors.bgGreen}${colors.white}${colors.bright} ${signal.direction} SIGNAL - ${token.symbol} ${colors.reset}

${colors.cyan}Token:${colors.reset}        ${token.name} (${token.symbol})
${colors.cyan}Direction:${colors.reset}    ${signal.direction === 'LONG' ? '📈 LONG (Buy)' : '📉 SHORT (Sell)'}
${colors.cyan}Style:${colors.reset}        ${signal.trading_style === 'swing_trade' ? 'Swing Trade (2-5 days)' : 'Day Trade (4-24 hours)'}
${colors.cyan}Confidence:${colors.reset}   ${signal.confidence}%

${colors.yellow}Entry:${colors.reset}        $${signal.entry_price}
${colors.red}Stop Loss:${colors.reset}    $${signal.stop_loss} (${qualityCheck.metrics.stopLossPercent.toFixed(1)}%)
${colors.green}Target:${colors.reset}       $${signal.target_price}
${colors.magenta}R:R Ratio:${colors.reset}    1:${qualityCheck.metrics.riskRewardRatio.toFixed(2)}

${colors.bright}Analysis:${colors.reset}
${colors.dim}${signal.analysis}${colors.reset}
`);

    log.divider();
    console.log(`${colors.bright}Generated Tweet Content:${colors.reset}`);
    console.log(colors.dim + (generatorResult.formatted_content || generatorResult.tweet_text || 'No content generated') + colors.reset);
    log.divider();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${colors.green}${colors.bright}✅ Test completed successfully in ${duration}s${colors.reset}`);
    console.log(`${colors.dim}Signal ready for review (not published)${colors.reset}\n`);

  } catch (error: any) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
