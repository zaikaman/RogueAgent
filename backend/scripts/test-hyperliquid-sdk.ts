import dotenv from 'dotenv';
dotenv.config();

import { Hyperliquid } from 'hyperliquid';
import { ethers } from 'ethers';

// ═══════════════════════════════════════════════════════════════════════════════
// HYPERLIQUID SDK TEST
// Uses the official Hyperliquid SDK for proper signing
// Usage:
//   npx ts-node scripts/test-hyperliquid-sdk.ts                    # Uses .env private key
//   npx ts-node scripts/test-hyperliquid-sdk.ts --key=0x...        # Uses provided private key
//   npx ts-node scripts/test-hyperliquid-sdk.ts --execute          # Execute a test trade
//   npx ts-node scripts/test-hyperliquid-sdk.ts --execute --short  # Execute a SHORT trade
// ═══════════════════════════════════════════════════════════════════════════════

async function testWithSDK() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  HYPERLIQUID SDK TEST - Testnet');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get private key from command line or .env
  const keyArg = process.argv.find(arg => arg.startsWith('--key='));
  const privateKey = keyArg?.split('=')[1] || process.env.HYPERLIQUID_WALLET_PRIVATE_KEY;

  if (!privateKey) {
    console.log('❌ No private key provided.');
    console.log('   Use --key=0x... or set HYPERLIQUID_WALLET_PRIVATE_KEY in .env');
    process.exit(1);
  }

  // Derive wallet address from private key
  const wallet = new ethers.Wallet(privateKey);
  console.log(`📍 Wallet: ${wallet.address}\n`);

  const shouldExecute = process.argv.includes('--execute');
  const direction = process.argv.includes('--short') ? 'SHORT' : 'LONG';

  try {
    // Initialize SDK
    console.log('🔌 Initializing Hyperliquid SDK...');
    const sdk = new Hyperliquid({
      privateKey,
      testnet: true,
    });

    // Connect
    await sdk.connect();
    console.log('✅ SDK connected!\n');

    // Get account info
    console.log('📊 Fetching account info...');
    const info = sdk.info;
    
    // Get user state
    const userState = await info.perpetuals.getClearinghouseState(wallet.address);
    const balance = parseFloat(userState.marginSummary.accountValue);
    console.log(`   Balance: $${balance.toFixed(2)}`);
    console.log(`   Withdrawable: $${parseFloat(userState.withdrawable).toFixed(2)}`);

    // Get perp metadata
    console.log('\n📈 Fetching perpetual metadata...');
    const meta = await info.perpetuals.getMeta();
    console.log(`   ${meta.universe.length} perpetual assets available`);

    // Show some assets with max leverage
    const testAssets = ['BTC', 'ETH', 'SOL', 'DOGE', 'WIF'];
    console.log('\n   Asset Info:');
    // Show first 10 available assets
    console.log('   First 10 available assets:');
    meta.universe.slice(0, 10).forEach((a: any) => {
      console.log(`   - ${a.name}: ${a.maxLeverage}x max`);
    });

    // Get positions
    console.log('\n📋 Current positions:');
    const positions = userState.assetPositions.filter(
      (p: any) => parseFloat(p.position.szi) !== 0
    );
    
    if (positions.length === 0) {
      console.log('   No open positions');
    } else {
      positions.forEach((p: any) => {
        const pos = p.position;
        console.log(`   - ${parseFloat(pos.szi) > 0 ? 'LONG' : 'SHORT'} ${pos.coin}`);
        console.log(`     Entry: $${pos.entryPx} | Size: ${pos.szi}`);
      });
    }

    // Execute trade
    if (shouldExecute) {
      console.log('\n🎯 Executing test trade...');
      console.log('   ⚠️  TESTNET order\n');

      // SDK uses -PERP suffix for perpetual symbols
      // Find ETH in the metadata we already fetched
      const symbol = meta.universe.find((a: any) => 
        a.name === 'ETH-PERP' || a.name === 'ETH'
      )?.name || 'ETH-PERP';
      
      console.log(`   Using symbol: ${symbol}`);
      
      const exchange = sdk.exchange;
      
      // Get current price from meta context
      const metaAndCtxs = await info.perpetuals.getMetaAndAssetCtxs();
      const metaData = metaAndCtxs[0];
      const ctxs = metaAndCtxs[1];
      
      const ethIndex = metaData.universe.findIndex((a: any) => 
        a.name === symbol || a.name === 'ETH' || a.name === 'ETH-PERP'
      );
      console.log(`   ${symbol} index: ${ethIndex}`);
      
      if (ethIndex === -1 || !ctxs[ethIndex]) {
        console.log(`   ❌ ${symbol} not found in contexts`);
        console.log('   Available symbols:', metaData.universe.slice(0, 20).map((a: any) => a.name).join(', '));
        await sdk.disconnect();
        process.exit(1);
      }
      
      const ethCtx = ctxs[ethIndex];
      const price = parseFloat(ethCtx.markPx);
      
      const asset = metaData.universe[ethIndex];
      const maxLev = asset?.maxLeverage || 10;
      const leverage = Math.min(5, maxLev);
      
      // Small position - $20 notional
      const notional = 20;
      const size = notional / price;
      const roundedSize = Math.round(size * 10000) / 10000; // 4 decimals
      
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Direction: ${direction}`);
      console.log(`   Price: $${price.toFixed(2)}`);
      console.log(`   Size: ${roundedSize} (~$${notional})`);
      console.log(`   Max Leverage: ${maxLev}x`);
      console.log(`   Using Leverage: ${leverage}x`);

      // Update leverage - SDK uses: updateLeverage(symbol, leverageMode, leverage)
      console.log('\n   Setting leverage...');
      try {
        await exchange.updateLeverage(symbol, 'isolated', leverage);
        console.log(`   ✅ Leverage set to ${leverage}x`);
      } catch (e: any) {
        console.log(`   ⚠️ Leverage update: ${e.message}`);
      }

      // Place market order (IOC limit at current price = market-like)
      console.log('\n   Placing market order...');
      try {
        const order = await exchange.placeOrder({
          coin: symbol,
          is_buy: direction === 'LONG',
          sz: roundedSize,
          limit_px: price,
          order_type: { limit: { tif: 'Ioc' } }, // IOC for market-like execution
          reduce_only: false,
        });
        console.log('   Order response:', JSON.stringify(order, null, 2));
      } catch (e: any) {
        console.log(`   ❌ Order failed: ${e.message}`);
        if (e.response?.data) {
          console.log('   Response:', JSON.stringify(e.response.data, null, 2));
        }
      }

      // Check final state
      console.log('\n   Final state:');
      const finalState = await info.perpetuals.getClearinghouseState(wallet.address);
      const finalPositions = finalState.assetPositions.filter(
        (p: any) => parseFloat(p.position.szi) !== 0
      );
      
      if (finalPositions.length === 0) {
        console.log('   No positions (order likely failed - need testnet funds)');
      } else {
        finalPositions.forEach((p: any) => {
          console.log(`   ✅ ${p.position.coin}: ${p.position.szi} @ $${p.position.entryPx}`);
        });
      }
    } else {
      console.log('\n💡 To execute a test trade, run with --execute flag');
      console.log('   npx ts-node scripts/test-hyperliquid-sdk.ts --execute');
    }

    // Disconnect
    await sdk.disconnect();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testWithSDK();
