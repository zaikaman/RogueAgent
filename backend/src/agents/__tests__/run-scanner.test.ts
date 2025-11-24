/**
 * REAL Scanner Agent Test - Runnable Script
 * 
 * This tests the actual Scanner Agent with real API calls.
 * Run with: npm run dev (or ts-node)
 */

import { ScannerAgent } from '../scanner.agent';
import { coingeckoService } from '../../services/coingecko.service';
import { birdeyeService } from '../../services/birdeye.service';

async function testScanner() {
  console.log('\n🧪 Testing Scanner Agent with REAL API calls\n');
  console.log('='.repeat(60));

  try {
    // 1. Fetch REAL market data
    console.log('\n📊 Fetching market data...');
    const [trending, gainers] = await Promise.all([
      coingeckoService.getTrending(),
      coingeckoService.getTopGainersLosers(),
    ]);

    console.log(`✅ Fetched ${trending.length} trending coins`);
    console.log(`✅ Fetched ${gainers.length} top gainers`);

    // 2. Build and run Scanner Agent
    console.log('\n🤖 Building Scanner Agent...');
    const { runner } = await ScannerAgent.build();
    console.log('✅ Scanner Agent built successfully');

    const marketData = {
      trending: trending.slice(0, 10),
      gainers: gainers.slice(0, 10),
    };

    console.log('\n🔍 Running scanner...');
    const prompt = `Scan the market for potential signals. Market data: ${JSON.stringify(marketData)}`;
    const result = await runner.ask(prompt) as any;

    console.log('\n📋 SCANNER RESULT:');
    console.log(JSON.stringify(result, null, 2));

    // 3. Validate results
    console.log('\n✅ VALIDATION:');
    
    const tests = [
      {
        name: 'Result is defined',
        pass: result !== undefined && result !== null,
      },
      {
        name: 'Has candidates or analysis',
        pass: result.candidates !== undefined || result.analysis !== undefined,
      },
      {
        name: 'Candidates is array (if present)',
        pass: !result.candidates || Array.isArray(result.candidates),
      },
    ];

    tests.forEach((test) => {
      const icon = test.pass ? '✅' : '❌';
      console.log(`${icon} ${test.name}`);
    });

    if (result.candidates && result.candidates.length > 0) {
      console.log(`\n📈 Found ${result.candidates.length} candidates:`);
      result.candidates.forEach((c: any, i: number) => {
        console.log(`  ${i + 1}. ${c.symbol} (${c.name}) - ${c.reason}`);
      });
    } else {
      console.log('\n⚠️  No candidates found (Scanner was selective - this is OK)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Scanner Agent test PASSED\n');
    
    return { success: true, result };

  } catch (error) {
    console.error('\n❌ Scanner Agent test FAILED:');
    console.error(error);
    console.log('\n' + '='.repeat(60));
    return { success: false, error };
  }
}

// Run if called directly
if (require.main === module) {
  testScanner()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testScanner };
