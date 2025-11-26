import dotenv from 'dotenv';
dotenv.config();

import { HyperliquidService } from '../src/services/hyperliquid.service';
import { ethers } from 'ethers';

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE HYPERLIQUID TEST
// Tests the Hyperliquid API directly without needing database/agents
// Uses HYPERLIQUID_WALLET_PRIVATE_KEY from .env
// ═══════════════════════════════════════════════════════════════════════════════

async function testHyperliquidDirect() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  HYPERLIQUID DIRECT API TEST - Testnet');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const privateKey = process.env.HYPERLIQUID_WALLET_PRIVATE_KEY;
  
  if (!privateKey) {
    console.log('❌ HYPERLIQUID_WALLET_PRIVATE_KEY not found in .env');
    console.log('   Please add your testnet wallet private key to backend/.env');
    process.exit(1);
  }

  // Derive wallet address from private key
  const wallet = new ethers.Wallet(privateKey);
  const walletAddress = wallet.address;
  
  console.log(`📍 Wallet Address: ${walletAddress}`);
  console.log(`   (Derived from private key in .env)\n`);

  const shouldExecute = process.argv.includes('--execute');
  const direction = process.argv.includes('--short') ? 'SHORT' : 'LONG';

  try {
    // Create Hyperliquid service
    const hyperliquid = new HyperliquidService(
      { privateKey, walletAddress },
      true // testnet
    );

    // Step 1: Test connection
    console.log('📡 Step 1: Testing connection...');
    const conn = await hyperliquid.testConnection();
    
    if (!conn.success) {
      console.log(`❌ Connection failed: ${conn.error}`);
      process.exit(1);
    }
    
    console.log(`✅ Connected! Balance: $${conn.balance?.toFixed(2)}\n`);

    // Step 2: Fetch asset metadata
    console.log('📊 Step 2: Fetching asset metadata...');
    const meta = await hyperliquid.getMeta();
    console.log(`   Loaded ${meta.universe.length} perpetual assets`);

    // Show some popular assets and their max leverage
    const popularAssets = ['BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'PEPE', 'WIF', 'BONK'];
    console.log('\n   Asset Max Leverage:');
    
    for (const symbol of popularAssets) {
      try {
        const maxLev = await hyperliquid.getMaxLeverage(symbol);
        const info = await hyperliquid.getSymbolInfo(symbol);
        const price = await hyperliquid.getPrice(symbol);
        console.log(`   - ${symbol.padEnd(6)} ${maxLev}x max | $${price.toFixed(info?.szDecimals || 2)}`);
      } catch {
        console.log(`   - ${symbol.padEnd(6)} (not available)`);
      }
    }

    // Step 3: Check current positions
    console.log('\n📈 Step 3: Current positions...');
    const positions = await hyperliquid.getFormattedPositions();
    
    if (positions.length === 0) {
      console.log('   No open positions');
    } else {
      positions.forEach(p => {
        const pnlColor = p.unrealizedPnl >= 0 ? '\x1b[32m' : '\x1b[31m';
        console.log(`   ${p.direction} ${p.symbol} @ ${p.leverage}x`);
        console.log(`   Entry: $${p.entryPrice.toFixed(2)} | Now: $${p.currentPrice.toFixed(2)}`);
        console.log(`   ${pnlColor}PnL: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPercent.toFixed(2)}%)\x1b[0m`);
      });
    }

    // Step 4: Check open orders
    console.log('\n📋 Step 4: Open orders...');
    const orders = await hyperliquid.getOpenOrders();
    
    if (orders.length === 0) {
      console.log('   No open orders');
    } else {
      console.log(`   ${orders.length} open order(s)`);
      orders.slice(0, 5).forEach((o: any) => {
        console.log(`   - ${o.side} ${o.coin} @ $${o.limitPx} (${o.sz} qty)`);
      });
    }

    // Step 5: Execute test trade
    if (shouldExecute) {
      console.log('\n🎯 Step 5: Executing TEST trade...');
      console.log('   ⚠️  REAL order on Hyperliquid TESTNET\n');
      
      // Use ETH for testing - it's liquid and has good leverage
      const symbol = 'ETH';
      const price = await hyperliquid.getPrice(symbol);
      const maxLev = await hyperliquid.getMaxLeverage(symbol);
      const leverage = Math.min(5, maxLev); // Use 5x or asset max
      
      // Calculate position size - use ~$20 notional for test
      const notionalValue = 20; // $20 test
      const quantity = notionalValue / price;
      
      // Set leverage
      console.log(`   Setting leverage to ${leverage}x...`);
      const levResult = await hyperliquid.setLeverage(symbol, leverage, false);
      console.log(`   ✅ Leverage set to ${levResult.actualLeverage}x (requested: ${leverage}x)`);

      // Calculate TP/SL
      const isLong = direction === 'LONG';
      const tpPrice = isLong ? price * 1.015 : price * 0.985; // 1.5% TP
      const slPrice = isLong ? price * 0.985 : price * 1.015; // 1.5% SL

      console.log(`\n   Trade Details:`);
      console.log(`   - Direction: ${direction}`);
      console.log(`   - Symbol: ${symbol}`);
      console.log(`   - Current Price: $${price.toFixed(2)}`);
      console.log(`   - Quantity: ${quantity.toFixed(4)}`);
      console.log(`   - Notional: ~$${notionalValue}`);
      console.log(`   - Leverage: ${levResult.actualLeverage}x`);
      console.log(`   - Take Profit: $${tpPrice.toFixed(2)} (${isLong ? '+' : '-'}1.5%)`);
      console.log(`   - Stop Loss: $${slPrice.toFixed(2)} (${isLong ? '-' : '+'}1.5%)`);

      // Place market entry order
      console.log('\n   Placing entry order...');
      const entryOrder = await hyperliquid.placeOrder({
        symbol,
        isBuy: isLong,
        size: quantity,
        orderType: 'market',
      });

      console.log(`   Entry order response:`, JSON.stringify(entryOrder, null, 2));

      if (entryOrder.status === 'ok') {
        console.log('   ✅ Entry order placed!');

        // Place TP order (limit)
        console.log('\n   Placing take-profit order...');
        try {
          const tpOrder = await hyperliquid.placeOrder({
            symbol,
            isBuy: !isLong, // opposite side
            size: quantity,
            price: tpPrice,
            reduceOnly: true,
            orderType: 'limit',
            timeInForce: 'Gtc',
          });
          console.log(`   TP order response:`, JSON.stringify(tpOrder, null, 2));
        } catch (e: any) {
          console.log(`   ⚠️ TP order failed: ${e.message}`);
        }

        // Place SL trigger order
        console.log('\n   Placing stop-loss trigger order...');
        try {
          const slOrder = await hyperliquid.placeTriggerOrder({
            symbol,
            isBuy: !isLong, // opposite side
            size: quantity,
            triggerPrice: slPrice,
            reduceOnly: true,
            triggerType: 'sl',
          });
          console.log(`   SL order response:`, JSON.stringify(slOrder, null, 2));
        } catch (e: any) {
          console.log(`   ⚠️ SL order failed: ${e.message}`);
        }
      } else {
        console.log(`   ❌ Entry order failed: ${JSON.stringify(entryOrder)}`);
      }

      // Final position check
      console.log('\n   Checking final positions...');
      await new Promise(r => setTimeout(r, 1000)); // Wait 1s for update
      
      const finalPositions = await hyperliquid.getFormattedPositions();
      if (finalPositions.length === 0) {
        console.log('   No positions found (order may have failed)');
      } else {
        finalPositions.forEach(p => {
          console.log(`   ✅ ${p.direction} ${p.symbol} | Qty: ${p.quantity} | Entry: $${p.entryPrice.toFixed(2)}`);
        });
      }

      const finalOrders = await hyperliquid.getOpenOrders();
      if (finalOrders.length > 0) {
        console.log(`\n   Open orders after trade:`);
        finalOrders.forEach((o: any) => {
          console.log(`   - ${o.side} ${o.coin} @ $${o.limitPx}`);
        });
      }
    } else {
      console.log('\n🎯 Step 5: Test trade skipped');
      console.log('   To execute a test trade, run with --execute flag:');
      console.log('   npx ts-node scripts/test-hyperliquid.ts --execute');
      console.log('   npx ts-node scripts/test-hyperliquid.ts --execute --short  (for SHORT)');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error(error.stack);
    process.exit(1);
  }
}

testHyperliquidDirect();
