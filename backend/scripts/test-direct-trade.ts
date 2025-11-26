import dotenv from 'dotenv';
dotenv.config();

import { HyperliquidService } from '../src/services/hyperliquid.service';

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT HYPERLIQUID TESTNET TRADE TEST
// Places a real trade on Hyperliquid testnet using raw credentials
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

// Raw credentials from .env
const PRIVATE_KEY = '';
const WALLET_ADDRESS = '';

async function main() {
  console.log(`
${COLORS.bgBlue}${COLORS.bright}                                                          ${COLORS.reset}
${COLORS.bgBlue}${COLORS.bright}   🚀 HYPERLIQUID TESTNET - DIRECT TRADE TEST 🚀          ${COLORS.reset}
${COLORS.bgBlue}${COLORS.bright}                                                          ${COLORS.reset}
`);

  console.log(`${COLORS.cyan}Wallet:${COLORS.reset} ${WALLET_ADDRESS}`);
  console.log(`${COLORS.cyan}Network:${COLORS.reset} TESTNET\n`);

  // Parse command line args
  const args = process.argv.slice(2);
  const symbol = args.find(a => a.startsWith('--symbol='))?.split('=')[1]?.toUpperCase() || 'ETH';
  const direction = (args.find(a => a.startsWith('--direction='))?.split('=')[1]?.toUpperCase() || 'LONG') as 'LONG' | 'SHORT';
  const riskPercent = parseFloat(args.find(a => a.startsWith('--risk='))?.split('=')[1] || '1');
  const leverage = parseInt(args.find(a => a.startsWith('--leverage='))?.split('=')[1] || '5', 10);
  const closeAll = args.includes('--close-all');
  const closeSymbol = args.find(a => a.startsWith('--close='))?.split('=')[1]?.toUpperCase();
  const showPositions = args.includes('--positions');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`${COLORS.bright}Usage:${COLORS.reset}`);
    console.log('  npx ts-node scripts/test-direct-trade.ts [options]');
    console.log();
    console.log(`${COLORS.bright}Trading Options:${COLORS.reset}`);
    console.log('  --symbol=ETH        Symbol to trade (default: ETH)');
    console.log('  --direction=LONG    LONG or SHORT (default: LONG)');
    console.log('  --risk=1            Risk percent per trade (default: 1)');
    console.log('  --leverage=5        Leverage to use (default: 5)');
    console.log();
    console.log(`${COLORS.bright}Position Management:${COLORS.reset}`);
    console.log('  --positions         Show current positions only');
    console.log('  --close=ETH         Close position for specific symbol');
    console.log('  --close-all         Close all open positions');
    console.log();
    console.log(`${COLORS.bright}Examples:${COLORS.reset}`);
    console.log('  # Open ETH LONG with 1% risk at 5x leverage:');
    console.log('  npx ts-node scripts/test-direct-trade.ts');
    console.log();
    console.log('  # Open BTC SHORT with 2% risk at 10x leverage:');
    console.log('  npx ts-node scripts/test-direct-trade.ts --symbol=BTC --direction=SHORT --risk=2 --leverage=10');
    console.log();
    console.log('  # Close ETH position:');
    console.log('  npx ts-node scripts/test-direct-trade.ts --close=ETH');
    console.log();
    console.log('  # Close all positions:');
    console.log('  npx ts-node scripts/test-direct-trade.ts --close-all');
    process.exit(0);
  }

  try {
    // Initialize Hyperliquid service (testnet = true)
    console.log(`${COLORS.yellow}Connecting to Hyperliquid testnet...${COLORS.reset}\n`);
    
    const hyperliquid = new HyperliquidService({
      privateKey: PRIVATE_KEY,
      walletAddress: WALLET_ADDRESS,
    }, true); // testnet = true

    await hyperliquid.connect();
    console.log(`${COLORS.green}✓${COLORS.reset} Connected to Hyperliquid testnet\n`);

    // Get account info
    const connectionTest = await hyperliquid.testConnection();
    if (!connectionTest.success) {
      console.log(`${COLORS.red}✗${COLORS.reset} Connection failed: ${connectionTest.error}`);
      process.exit(1);
    }

    console.log(`${COLORS.bright}Account Info:${COLORS.reset}`);
    console.log(`  Balance: $${connectionTest.balance?.toFixed(2)}\n`);

    // Show current positions
    const positions = await hyperliquid.getFormattedPositions();
    console.log(`${COLORS.bright}Current Positions:${COLORS.reset} ${positions.length}`);
    if (positions.length > 0) {
      positions.forEach(p => {
        const pnlColor = p.unrealizedPnl >= 0 ? COLORS.green : COLORS.red;
        const dirColor = p.direction === 'LONG' ? COLORS.green : COLORS.red;
        console.log(`  ${dirColor}${p.direction}${COLORS.reset} ${p.symbol} @ ${p.leverage}x`);
        console.log(`    Entry: $${p.entryPrice.toFixed(2)} | Current: $${p.currentPrice.toFixed(2)} | Qty: ${p.quantity}`);
        console.log(`    ${pnlColor}PnL: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPercent.toFixed(2)}%)${COLORS.reset}`);
      });
    } else {
      console.log(`  No open positions`);
    }
    console.log();

    // If just showing positions, exit
    if (showPositions) {
      await hyperliquid.disconnect();
      process.exit(0);
    }

    // Handle close operations
    if (closeAll) {
      console.log(`${COLORS.yellow}Closing all positions...${COLORS.reset}\n`);
      const result = await hyperliquid.closeAllPositions();
      
      if (result.closed.length > 0) {
        console.log(`${COLORS.green}✓${COLORS.reset} Closed positions: ${result.closed.join(', ')}`);
      }
      if (result.errors.length > 0) {
        console.log(`${COLORS.red}✗${COLORS.reset} Errors: ${result.errors.join(', ')}`);
      }
      if (result.closed.length === 0 && result.errors.length === 0) {
        console.log(`${COLORS.cyan}ℹ${COLORS.reset} No positions to close`);
      }
      
      await hyperliquid.disconnect();
      process.exit(0);
    }

    if (closeSymbol) {
      console.log(`${COLORS.yellow}Closing ${closeSymbol} position...${COLORS.reset}\n`);
      const result = await hyperliquid.closePosition(closeSymbol);
      
      if (result) {
        const filled = result.response?.data?.statuses?.[0]?.filled;
        if (filled) {
          console.log(`${COLORS.green}✓${COLORS.reset} Position closed`);
          console.log(`  Size: ${filled.totalSz} @ $${parseFloat(filled.avgPx).toFixed(2)}`);
        } else {
          console.log(`${COLORS.yellow}⚠${COLORS.reset} Order placed but not filled immediately`);
          console.log(`  Response:`, JSON.stringify(result, null, 2));
        }
      } else {
        console.log(`${COLORS.cyan}ℹ${COLORS.reset} No position found for ${closeSymbol}`);
      }
      
      await hyperliquid.disconnect();
      process.exit(0);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPEN NEW TRADE
    // ═══════════════════════════════════════════════════════════════════════════

    // Get current price and max leverage
    const currentPrice = await hyperliquid.getPrice(symbol);
    const maxLeverage = await hyperliquid.getMaxLeverage(symbol);
    const actualLeverage = Math.min(leverage, maxLeverage);

    console.log(`${COLORS.bright}Trade Setup:${COLORS.reset}`);
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Direction: ${direction === 'LONG' ? COLORS.green : COLORS.red}${direction}${COLORS.reset}`);
    console.log(`  Current Price: $${currentPrice.toFixed(2)}`);
    console.log(`  Max Leverage: ${maxLeverage}x`);
    console.log(`  Using Leverage: ${actualLeverage}x`);
    console.log(`  Risk: ${riskPercent}%`);

    // Calculate TP/SL based on direction
    const isLong = direction === 'LONG';
    const tpMultiplier = isLong ? 1.02 : 0.98;  // 2% profit target
    const slMultiplier = isLong ? 0.99 : 1.01;  // 1% stop loss

    const takeProfitPrice = currentPrice * tpMultiplier;
    const stopLossPrice = currentPrice * slMultiplier;

    console.log(`  Take Profit: $${takeProfitPrice.toFixed(2)} (${isLong ? '+2%' : '-2%'})`);
    console.log(`  Stop Loss: $${stopLossPrice.toFixed(2)} (${isLong ? '-1%' : '+1%'})`);
    console.log();

    // Check if account has balance
    if (!connectionTest.balance || connectionTest.balance < 1) {
      console.log(`${COLORS.bgRed}${COLORS.bright} ⚠️  INSUFFICIENT BALANCE ${COLORS.reset}\n`);
      console.log(`${COLORS.yellow}Your testnet account has $${connectionTest.balance?.toFixed(2) || '0.00'} balance.${COLORS.reset}`);
      console.log();
      console.log(`${COLORS.bright}To fund your Hyperliquid testnet account:${COLORS.reset}`);
      console.log(`  1. Go to: ${COLORS.cyan}https://app.hyperliquid-testnet.xyz/${COLORS.reset}`);
      console.log(`  2. Connect your wallet: ${COLORS.cyan}${WALLET_ADDRESS}${COLORS.reset}`);
      console.log(`  3. Click "Deposit" on the left sidebar`);
      console.log(`  4. Use the testnet faucet to get test USDC (usually 1000 USDC)`);
      console.log(`  5. Wait for the deposit to confirm`);
      console.log(`  6. Re-run this script after depositing\n`);
      
      console.log(`${COLORS.yellow}Note: Hyperliquid testnet requires funded balance to place orders.${COLORS.reset}`);
      console.log(`${COLORS.yellow}Orders with zero margin will be rejected.${COLORS.reset}\n`);
      
      await hyperliquid.disconnect();
      process.exit(1);
    }

    console.log(`${COLORS.bgBlue}${COLORS.bright} PLACING ORDER... ${COLORS.reset}\n`);

    // Place the bracket order (entry + TP + SL)
    const result = await hyperliquid.openBracketPosition({
      symbol,
      side: direction,
      riskPercent,
      leverage: actualLeverage,
      takeProfitPrice,
      stopLossPrice,
      clientOrderIdPrefix: 'TEST',
    });

    // Check results
    const entryFilled = result.entryOrder.response?.data?.statuses?.[0]?.filled;
    
    if (entryFilled) {
      console.log(`${COLORS.green}✓${COLORS.reset} ${COLORS.bright}ENTRY ORDER FILLED${COLORS.reset}`);
      console.log(`  Size: ${entryFilled.totalSz} ${symbol}`);
      console.log(`  Avg Price: $${parseFloat(entryFilled.avgPx).toFixed(2)}`);
      console.log(`  Order ID: ${entryFilled.oid}`);
    } else {
      const entryError = result.entryOrder.response?.data?.statuses?.[0]?.error;
      console.log(`${COLORS.red}✗${COLORS.reset} Entry order failed: ${entryError || 'Unknown error'}`);
      console.log('  Full response:', JSON.stringify(result.entryOrder, null, 2));
    }

    // TP order status
    if (result.tpOrder) {
      const tpResting = result.tpOrder.response?.data?.statuses?.[0]?.resting;
      const tpError = result.tpOrder.response?.data?.statuses?.[0]?.error;
      if (tpResting) {
        console.log(`${COLORS.green}✓${COLORS.reset} Take Profit order placed @ $${takeProfitPrice.toFixed(2)}`);
      } else if (tpError) {
        console.log(`${COLORS.yellow}⚠${COLORS.reset} Take Profit order: ${tpError}`);
      }
    }

    // SL order status
    if (result.slOrder) {
      const slResting = result.slOrder.response?.data?.statuses?.[0]?.resting;
      const slError = result.slOrder.response?.data?.statuses?.[0]?.error;
      if (slResting) {
        console.log(`${COLORS.green}✓${COLORS.reset} Stop Loss order placed @ $${stopLossPrice.toFixed(2)}`);
      } else if (slError) {
        console.log(`${COLORS.yellow}⚠${COLORS.reset} Stop Loss order: ${slError}`);
      }
    }

    console.log();

    // Show updated positions
    console.log(`${COLORS.bright}Updated Positions:${COLORS.reset}`);
    const updatedPositions = await hyperliquid.getFormattedPositions();
    if (updatedPositions.length > 0) {
      updatedPositions.forEach(p => {
        const pnlColor = p.unrealizedPnl >= 0 ? COLORS.green : COLORS.red;
        const dirColor = p.direction === 'LONG' ? COLORS.green : COLORS.red;
        console.log(`  ${dirColor}${p.direction}${COLORS.reset} ${p.symbol} @ ${p.leverage}x`);
        console.log(`    Entry: $${p.entryPrice.toFixed(2)} | Current: $${p.currentPrice.toFixed(2)} | Qty: ${p.quantity}`);
        console.log(`    ${pnlColor}PnL: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPercent.toFixed(2)}%)${COLORS.reset}`);
      });
    } else {
      console.log(`  No open positions (order may have been rejected)`);
    }

    // Disconnect
    await hyperliquid.disconnect();

    console.log(`
${COLORS.bgGreen}${COLORS.bright}                                                          ${COLORS.reset}
${COLORS.bgGreen}${COLORS.bright}   ✅ TRADE TEST COMPLETE                                 ${COLORS.reset}
${COLORS.bgGreen}${COLORS.bright}                                                          ${COLORS.reset}
`);

  } catch (error: any) {
    console.log(`
${COLORS.bgRed}${COLORS.bright}                                                          ${COLORS.reset}
${COLORS.bgRed}${COLORS.bright}   ❌ TRADE FAILED                                         ${COLORS.reset}
${COLORS.bgRed}${COLORS.bright}                                                          ${COLORS.reset}
`);
    console.error(`${COLORS.red}Error: ${error.message}${COLORS.reset}`);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error(error.stack);
    process.exit(1);
  }
}

main();
