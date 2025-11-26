import dotenv from 'dotenv';
dotenv.config();

import { futuresAgentsService } from '../src/services/futures-agents.service';
import { signalExecutorService } from '../src/services/signal-executor.service';
import { SignalContent } from '../shared/types/signal.types';
import { logger } from '../src/utils/logger.util';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUTURES SIGNAL EXECUTION
// This script creates a mock signal and tests the Hyperliquid integration
// ═══════════════════════════════════════════════════════════════════════════════

async function testFuturesSignal() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  FUTURES SIGNAL TEST - Hyperliquid Testnet Integration');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test wallet address - replace with your actual wallet if needed
  const testWalletAddress = process.argv[2] || '';
  
  if (!testWalletAddress) {
    console.log('Usage: npx ts-node scripts/test-futures-signal.ts <wallet_address>');
    console.log('\nThis will:');
    console.log('  1. Check if you have an active futures agent');
    console.log('  2. Test connection to Hyperliquid testnet');
    console.log('  3. Check max leverage for ETH');
    console.log('  4. (Optional) Execute a test signal if --execute flag is passed');
    process.exit(1);
  }

  const shouldExecute = process.argv.includes('--execute');

  try {
    // Step 1: Check for active agents
    console.log('📋 Step 1: Checking for active futures agents...');
    const agents = await futuresAgentsService.getActiveAgents(testWalletAddress);
    
    if (agents.length === 0) {
      console.log('❌ No active futures agents found for this wallet');
      console.log('   Please create and activate an agent in the Futures Agents page first');
      
      // Check if there are any agents at all
      const allAgents = await futuresAgentsService.getUserAgents(testWalletAddress);
      if (allAgents.length > 0) {
        console.log(`\n   Found ${allAgents.length} inactive agent(s):`);
        allAgents.forEach(a => {
          console.log(`   - ${a.name} (${a.type}) - Active: ${a.is_active}`);
        });
      }
      process.exit(1);
    }

    console.log(`✅ Found ${agents.length} active agent(s):`);
    agents.forEach(a => {
      console.log(`   - ${a.name} (${a.type})`);
      console.log(`     Risk: ${a.risk_per_trade}%, Max Leverage: ${a.max_leverage}x, Max Positions: ${a.max_concurrent_positions}`);
    });

    // Step 2: Test Hyperliquid connection
    console.log('\n📡 Step 2: Testing Hyperliquid testnet connection...');
    const hyperliquid = await futuresAgentsService.getHyperliquidService(testWalletAddress);
    
    if (!hyperliquid) {
      console.log('❌ No Hyperliquid service available');
      console.log('   Please set up your API keys in the Futures Agents page first');
      process.exit(1);
    }

    const connectionTest = await hyperliquid.testConnection();
    if (!connectionTest.success) {
      console.log(`❌ Connection failed: ${connectionTest.error}`);
      process.exit(1);
    }
    
    console.log(`✅ Connected! Account balance: $${connectionTest.balance?.toFixed(2)}`);

    // Step 3: Check available symbols and their max leverage
    console.log('\n📊 Step 3: Fetching asset info from Hyperliquid...');
    
    const testSymbols = ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'WIF'];
    console.log('   Max leverage per asset:');
    
    for (const symbol of testSymbols) {
      try {
        const maxLev = await hyperliquid.getMaxLeverage(symbol);
        const price = await hyperliquid.getPrice(symbol);
        console.log(`   - ${symbol}: ${maxLev}x (price: $${price.toFixed(2)})`);
      } catch (e: any) {
        console.log(`   - ${symbol}: Not available`);
      }
    }

    // Step 4: Check current positions
    console.log('\n📈 Step 4: Checking current positions...');
    const positions = await hyperliquid.getFormattedPositions();
    
    if (positions.length === 0) {
      console.log('   No open positions');
    } else {
      console.log(`   ${positions.length} open position(s):`);
      positions.forEach(p => {
        const pnlColor = p.unrealizedPnl >= 0 ? '\x1b[32m' : '\x1b[31m';
        console.log(`   - ${p.direction} ${p.symbol} @ ${p.leverage}x`);
        console.log(`     Entry: $${p.entryPrice.toFixed(2)} | Current: $${p.currentPrice.toFixed(2)}`);
        console.log(`     ${pnlColor}PnL: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPercent.toFixed(2)}%)\x1b[0m`);
      });
    }

    // Step 5: Create mock signal and test execution
    if (shouldExecute) {
      console.log('\n🎯 Step 5: Creating and executing test signal...');
      console.log('   ⚠️  WARNING: This will place a REAL order on Hyperliquid TESTNET');
      
      // Get current ETH price
      const ethPrice = await hyperliquid.getPrice('ETH');
      const ethMaxLev = await hyperliquid.getMaxLeverage('ETH');
      
      // Create a small test signal - LONG ETH with tight targets
      const mockSignal: SignalContent = {
        token: {
          symbol: 'ETH',
          name: 'Ethereum',
          contract_address: '0x0000000000000000000000000000000000000000',
        },
        direction: 'LONG',
        entry_price: ethPrice,
        target_price: ethPrice * 1.02, // +2% target
        stop_loss: ethPrice * 0.98,    // -2% stop
        confidence: 85,
        trigger_event: {
          type: 'long_setup',
          description: 'Test signal for Hyperliquid integration',
        },
        analysis: 'TEST SIGNAL - This is a test signal for validating Hyperliquid integration',
        order_type: 'market',
        trading_style: 'day_trade',
        expected_duration: '1-4 hours',
      };

      console.log('\n   Signal Details:');
      console.log(`   - Direction: ${mockSignal.direction}`);
      console.log(`   - Symbol: ${mockSignal.token.symbol}`);
      console.log(`   - Entry: $${mockSignal.entry_price.toFixed(2)}`);
      console.log(`   - Target: $${mockSignal.target_price.toFixed(2)} (+2%)`);
      console.log(`   - Stop Loss: $${mockSignal.stop_loss.toFixed(2)} (-2%)`);
      console.log(`   - Asset Max Leverage: ${ethMaxLev}x`);

      // Process the signal
      const result = await signalExecutorService.processSignal({
        signalId: `test-${Date.now()}`,
        signal: mockSignal,
      });

      console.log('\n   Execution Results:');
      console.log(`   - Agents processed: ${result.processed}`);
      console.log(`   - Trades executed: ${result.executed}`);
      
      result.results.forEach(r => {
        if (r.success) {
          console.log(`   ✅ ${r.agentName}: Trade placed successfully`);
          if (r.trade) {
            console.log(`      Symbol: ${r.trade.symbol}, Direction: ${r.trade.direction}`);
            console.log(`      Quantity: ${r.trade.quantity}, Leverage: ${r.trade.leverage}x`);
          }
        } else {
          console.log(`   ❌ ${r.agentName}: ${r.error}`);
        }
      });

      // Check positions again
      console.log('\n📈 Final positions:');
      const finalPositions = await hyperliquid.getFormattedPositions();
      if (finalPositions.length === 0) {
        console.log('   No open positions (order may have failed or been rejected)');
      } else {
        finalPositions.forEach(p => {
          console.log(`   - ${p.direction} ${p.symbol} @ ${p.leverage}x | Qty: ${p.quantity}`);
        });
      }
    } else {
      console.log('\n🎯 Step 5: Skipped signal execution (add --execute to test)');
      console.log('   Run with: npx ts-node scripts/test-futures-signal.ts <wallet> --execute');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response?.data) {
      console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testFuturesSignal();
