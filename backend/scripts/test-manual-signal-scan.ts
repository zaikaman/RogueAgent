import dotenv from 'dotenv';
dotenv.config();

import { futuresAgentsService } from '../src/services/futures-agents.service';
import { signalExecutorService } from '../src/services/signal-executor.service';
import { SignalContent } from '../shared/types/signal.types';
import { supabaseService } from '../src/services/supabase.service';
import { logger } from '../src/utils/logger.util';
import readline from 'readline';

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL SIGNAL SCAN TEST
// Triggers a manual signal scan and executes trades on Hyperliquid
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

function printHeader(title: string) {
  console.log(`\n${COLORS.bgBlue}${COLORS.bright} ${title} ${COLORS.reset}`);
  console.log('━'.repeat(60));
}

function printSuccess(msg: string) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`);
}

function printError(msg: string) {
  console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`);
}

function printInfo(msg: string) {
  console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${msg}`);
}

function printWarning(msg: string) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`);
}

// Prompt user for confirmation
async function promptConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${COLORS.yellow}${question} (y/n): ${COLORS.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Get available trading symbols from Hyperliquid
async function getAvailableSymbols(hyperliquid: any): Promise<string[]> {
  const testSymbols = ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'WIF', 'BONK', 'ARB', 'OP', 'SUI'];
  const available: string[] = [];
  
  for (const symbol of testSymbols) {
    try {
      const isAvailable = await hyperliquid.isSymbolAvailable(symbol);
      if (isAvailable) {
        available.push(symbol);
      }
    } catch (e) {
      // Symbol not available
    }
  }
  
  return available;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchRecentSignals(limit: number = 5): Promise<any[]> {
  printHeader('FETCHING RECENT SIGNALS FROM DATABASE');
  
  try {
    const { data: runs, error } = await supabaseService.getClient()
      .from('runs')
      .select('*')
      .eq('type', 'signal')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !runs) {
      printError(`Failed to fetch signals: ${error?.message || 'No data'}`);
      return [];
    }

    if (runs.length === 0) {
      printWarning('No signals found in database');
      return [];
    }

    console.log(`\nFound ${runs.length} recent signals:\n`);
    
    runs.forEach((run, index) => {
      const content = run.content as SignalContent;
      const dirColor = content.direction === 'LONG' ? COLORS.green : COLORS.red;
      const statusColor = content.status === 'active' ? COLORS.green : 
                          content.status === 'tp_hit' ? COLORS.green : 
                          content.status === 'sl_hit' ? COLORS.red : COLORS.dim;
      
      console.log(`  ${COLORS.bright}[${index + 1}]${COLORS.reset} ${content.token.symbol} ${dirColor}${content.direction}${COLORS.reset}`);
      console.log(`      Entry: $${content.entry_price?.toFixed(4) || 'N/A'} → Target: $${content.target_price?.toFixed(4) || 'N/A'}`);
      console.log(`      Stop: $${content.stop_loss?.toFixed(4) || 'N/A'} | Status: ${statusColor}${content.status || 'active'}${COLORS.reset}`);
      console.log(`      ID: ${run.id.slice(0, 8)}... | Created: ${new Date(run.created_at).toLocaleString()}`);
      console.log();
    });

    return runs;
  } catch (error: any) {
    printError(`Error fetching signals: ${error.message}`);
    return [];
  }
}

async function checkDiamondUsersAndAgents() {
  printHeader('CHECKING DIAMOND USERS & ACTIVE AGENTS');
  
  try {
    const diamondUsers = await futuresAgentsService.getDiamondUsersWithActiveAgents();
    
    if (diamondUsers.length === 0) {
      printWarning('No Diamond users with active agents found');
      console.log('\n  To test, you need:');
      console.log('  1. A Diamond tier subscription');
      console.log('  2. At least one active Futures Agent');
      console.log('  3. Hyperliquid API credentials configured');
      return null;
    }

    console.log(`\nFound ${diamondUsers.length} Diamond user(s) with active agents:\n`);
    
    for (const user of diamondUsers) {
      console.log(`  ${COLORS.bright}Wallet:${COLORS.reset} ${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-6)}`);
      console.log(`  ${COLORS.bright}Agents:${COLORS.reset} ${user.agents.length}`);
      
      for (const agent of user.agents) {
        console.log(`    → ${agent.name} (${agent.type})`);
        console.log(`      Risk: ${agent.risk_per_trade}% | Max Leverage: ${agent.max_leverage}x`);
        console.log(`      Max Positions: ${agent.max_concurrent_positions}`);
      }
      console.log();
    }

    return diamondUsers;
  } catch (error: any) {
    printError(`Error checking Diamond users: ${error.message}`);
    return null;
  }
}

async function testHyperliquidConnection(walletAddress: string) {
  printHeader('TESTING HYPERLIQUID CONNECTION');
  
  try {
    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    
    if (!hyperliquid) {
      printError('No Hyperliquid service available for this wallet');
      return null;
    }

    const connectionTest = await hyperliquid.testConnection();
    
    if (!connectionTest.success) {
      printError(`Connection failed: ${connectionTest.error}`);
      return null;
    }

    printSuccess(`Connected to Hyperliquid successfully`);
    console.log(`  ${COLORS.bright}Balance:${COLORS.reset} $${connectionTest.balance?.toFixed(2)}`);

    // Get available symbols
    const availableSymbols = await getAvailableSymbols(hyperliquid);
    console.log(`  ${COLORS.bright}Available Symbols:${COLORS.reset} ${availableSymbols.join(', ')}`);

    // Check current positions
    const positions = await hyperliquid.getFormattedPositions();
    console.log(`  ${COLORS.bright}Open Positions:${COLORS.reset} ${positions.length}`);
    
    if (positions.length > 0) {
      console.log();
      positions.forEach(p => {
        const pnlColor = p.unrealizedPnl >= 0 ? COLORS.green : COLORS.red;
        console.log(`    ${p.direction} ${p.symbol} @ ${p.leverage}x`);
        console.log(`    Entry: $${p.entryPrice.toFixed(2)} | Current: $${p.currentPrice.toFixed(2)}`);
        console.log(`    ${pnlColor}PnL: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPercent.toFixed(2)}%)${COLORS.reset}`);
        console.log();
      });
    }

    return hyperliquid;
  } catch (error: any) {
    printError(`Connection error: ${error.message}`);
    return null;
  }
}

async function processSignalManually(
  signalId: string, 
  signal: SignalContent,
  dryRun: boolean = true
) {
  printHeader(dryRun ? 'DRY RUN - SIMULATING SIGNAL EXECUTION' : 'EXECUTING SIGNAL');
  
  const dirColor = signal.direction === 'LONG' ? COLORS.green : COLORS.red;
  
  console.log(`\n  ${COLORS.bright}Signal Details:${COLORS.reset}`);
  console.log(`  Symbol: ${signal.token.symbol} ${dirColor}${signal.direction}${COLORS.reset}`);
  console.log(`  Entry: $${signal.entry_price?.toFixed(4)}`);
  console.log(`  Target: $${signal.target_price?.toFixed(4)} (${((signal.target_price / signal.entry_price - 1) * 100).toFixed(2)}%)`);
  console.log(`  Stop Loss: $${signal.stop_loss?.toFixed(4)} (${((signal.stop_loss / signal.entry_price - 1) * 100).toFixed(2)}%)`);
  console.log(`  Confidence: ${signal.confidence}%`);
  console.log();

  if (dryRun) {
    printWarning('DRY RUN MODE - No actual trades will be placed');
    console.log('  Add --execute flag to actually execute trades\n');
    return null;
  }

  try {
    console.log(`  ${COLORS.yellow}Processing signal for all active agents...${COLORS.reset}\n`);
    
    const result = await signalExecutorService.processSignal({
      signalId,
      signal,
    });

    console.log(`  ${COLORS.bright}Results:${COLORS.reset}`);
    console.log(`  Agents Processed: ${result.processed}`);
    console.log(`  Trades Executed: ${result.executed}\n`);

    result.results.forEach(r => {
      if (r.success) {
        printSuccess(`${r.agentName}: Trade placed`);
        if (r.trade) {
          console.log(`    Symbol: ${r.trade.symbol} | Direction: ${r.trade.direction}`);
          console.log(`    Quantity: ${r.trade.quantity} | Leverage: ${r.trade.leverage}x`);
        }
      } else {
        printError(`${r.agentName}: ${r.error}`);
      }
    });

    return result;
  } catch (error: any) {
    printError(`Execution error: ${error.message}`);
    return null;
  }
}

async function createMockSignal(hyperliquid: any, symbol: string = 'ETH', direction: 'LONG' | 'SHORT' = 'LONG'): Promise<SignalContent> {
  const price = await hyperliquid.getPrice(symbol);
  const maxLev = await hyperliquid.getMaxLeverage(symbol);
  
  // Create realistic signal with 2% target and 1% stop
  const isLong = direction === 'LONG';
  const targetMultiplier = isLong ? 1.02 : 0.98;
  const stopMultiplier = isLong ? 0.99 : 1.01;

  return {
    token: {
      symbol,
      name: symbol,
      contract_address: '0x0000000000000000000000000000000000000000',
    },
    direction,
    entry_price: price,
    target_price: price * targetMultiplier,
    stop_loss: price * stopMultiplier,
    confidence: 80,
    trigger_event: {
      type: direction === 'LONG' ? 'long_setup' : 'short_setup',
      description: 'Manual test signal for Hyperliquid integration testing',
    },
    analysis: `[TEST SIGNAL] Manual test for ${symbol} ${direction} trade on Hyperliquid. Max leverage available: ${maxLev}x`,
    formatted_tweet: `TEST: ${direction} ${symbol}`,
    status: 'active',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
${COLORS.bgBlue}${COLORS.bright}                                                          ${COLORS.reset}
${COLORS.bgBlue}${COLORS.bright}   🎯 MANUAL SIGNAL SCAN & HYPERLIQUID TRADING TEST 🎯   ${COLORS.reset}
${COLORS.bgBlue}${COLORS.bright}                                                          ${COLORS.reset}
`);

  const args = process.argv.slice(2);
  const walletAddress = args.find(a => !a.startsWith('--')) || '';
  const shouldExecute = args.includes('--execute');
  const useMockSignal = args.includes('--mock');
  const signalSymbol = args.find(a => a.startsWith('--symbol='))?.split('=')[1] || 'ETH';
  const signalDirection = (args.find(a => a.startsWith('--direction='))?.split('=')[1]?.toUpperCase() || 'LONG') as 'LONG' | 'SHORT';
  const useLatestSignal = args.includes('--latest');
  const signalIndex = parseInt(args.find(a => a.startsWith('--signal='))?.split('=')[1] || '0', 10);

  if (!walletAddress) {
    console.log(`${COLORS.bright}Usage:${COLORS.reset}`);
    console.log('  npx ts-node scripts/test-manual-signal-scan.ts <wallet_address> [options]');
    console.log();
    console.log(`${COLORS.bright}Options:${COLORS.reset}`);
    console.log('  --execute           Actually execute trades (default: dry run)');
    console.log('  --mock              Use a mock signal instead of database signals');
    console.log('  --symbol=ETH        Symbol for mock signal (default: ETH)');
    console.log('  --direction=LONG    Direction for mock signal (LONG/SHORT, default: LONG)');
    console.log('  --latest            Use the most recent active signal from database');
    console.log('  --signal=N          Use the Nth signal from recent list (1-indexed)');
    console.log();
    console.log(`${COLORS.bright}Examples:${COLORS.reset}`);
    console.log('  # Dry run with mock ETH LONG signal:');
    console.log('  npx ts-node scripts/test-manual-signal-scan.ts 0x123... --mock');
    console.log();
    console.log('  # Execute mock BTC SHORT signal:');
    console.log('  npx ts-node scripts/test-manual-signal-scan.ts 0x123... --mock --symbol=BTC --direction=SHORT --execute');
    console.log();
    console.log('  # Execute using latest database signal:');
    console.log('  npx ts-node scripts/test-manual-signal-scan.ts 0x123... --latest --execute');
    console.log();
    process.exit(1);
  }

  try {
    // Step 1: Check Diamond users and agents
    const diamondUsers = await checkDiamondUsersAndAgents();
    if (!diamondUsers) {
      process.exit(1);
    }

    // Verify the provided wallet is a Diamond user
    const userMatch = diamondUsers.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    if (!userMatch) {
      printError(`Wallet ${walletAddress.slice(0, 8)}... is not a Diamond user with active agents`);
      console.log('\nAvailable Diamond wallets:');
      diamondUsers.forEach(u => {
        console.log(`  - ${u.walletAddress}`);
      });
      process.exit(1);
    }

    // Step 2: Test Hyperliquid connection
    const hyperliquid = await testHyperliquidConnection(walletAddress);
    if (!hyperliquid) {
      process.exit(1);
    }

    // Step 3: Get or create signal
    let signalToProcess: { id: string; signal: SignalContent } | null = null;

    if (useMockSignal) {
      printHeader('CREATING MOCK SIGNAL');
      const mockSignal = await createMockSignal(hyperliquid, signalSymbol, signalDirection);
      signalToProcess = {
        id: `manual-test-${Date.now()}`,
        signal: mockSignal,
      };
      printSuccess(`Mock signal created: ${signalSymbol} ${signalDirection}`);
    } else {
      const recentSignals = await fetchRecentSignals(10);
      
      if (recentSignals.length === 0) {
        printWarning('No signals in database. Use --mock to create a test signal.');
        process.exit(1);
      }

      if (useLatestSignal) {
        // Find most recent active signal
        const activeSignal = recentSignals.find(r => {
          const content = r.content as SignalContent;
          return content.status !== 'tp_hit' && content.status !== 'sl_hit' && content.status !== 'closed';
        });

        if (activeSignal) {
          signalToProcess = {
            id: activeSignal.id,
            signal: activeSignal.content as SignalContent,
          };
        } else {
          printWarning('No active signals found. Using most recent signal.');
          signalToProcess = {
            id: recentSignals[0].id,
            signal: recentSignals[0].content as SignalContent,
          };
        }
      } else if (signalIndex > 0 && signalIndex <= recentSignals.length) {
        signalToProcess = {
          id: recentSignals[signalIndex - 1].id,
          signal: recentSignals[signalIndex - 1].content as SignalContent,
        };
      } else {
        // Interactive selection
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const selectedIndex = await new Promise<number>((resolve) => {
          rl.question(`\n${COLORS.cyan}Select signal number (1-${recentSignals.length}): ${COLORS.reset}`, (answer) => {
            rl.close();
            resolve(parseInt(answer, 10) || 1);
          });
        });

        if (selectedIndex > 0 && selectedIndex <= recentSignals.length) {
          signalToProcess = {
            id: recentSignals[selectedIndex - 1].id,
            signal: recentSignals[selectedIndex - 1].content as SignalContent,
          };
        } else {
          printError('Invalid selection');
          process.exit(1);
        }
      }
    }

    if (!signalToProcess) {
      printError('No signal selected');
      process.exit(1);
    }

    // Step 4: Confirm and process
    if (shouldExecute) {
      const confirmed = await promptConfirmation(
        `\n⚠️  This will place REAL trades on Hyperliquid. Continue?`
      );
      
      if (!confirmed) {
        printInfo('Execution cancelled by user');
        process.exit(0);
      }
    }

    await processSignalManually(signalToProcess.id, signalToProcess.signal, !shouldExecute);

    // Step 5: Show final positions
    if (shouldExecute) {
      printHeader('FINAL POSITIONS');
      const finalPositions = await hyperliquid.getFormattedPositions();
      
      if (finalPositions.length === 0) {
        printInfo('No open positions');
      } else {
        finalPositions.forEach(p => {
          const pnlColor = p.unrealizedPnl >= 0 ? COLORS.green : COLORS.red;
          console.log(`  ${p.direction} ${p.symbol} @ ${p.leverage}x`);
          console.log(`  Entry: $${p.entryPrice.toFixed(2)} | Qty: ${p.quantity}`);
          console.log(`  ${pnlColor}PnL: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPercent.toFixed(2)}%)${COLORS.reset}`);
          console.log();
        });
      }
    }

    console.log(`
${COLORS.bgGreen}${COLORS.bright}                                                          ${COLORS.reset}
${COLORS.bgGreen}${COLORS.bright}   ✅ TEST COMPLETE                                       ${COLORS.reset}
${COLORS.bgGreen}${COLORS.bright}                                                          ${COLORS.reset}
`);

  } catch (error: any) {
    console.log(`
${COLORS.bgRed}${COLORS.bright}                                                          ${COLORS.reset}
${COLORS.bgRed}${COLORS.bright}   ❌ TEST FAILED                                         ${COLORS.reset}
${COLORS.bgRed}${COLORS.bright}                                                          ${COLORS.reset}
`);
    console.error(`${COLORS.red}Error: ${error.message}${COLORS.reset}`);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
