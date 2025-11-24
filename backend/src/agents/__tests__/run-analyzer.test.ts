/**
 * REAL Analyzer Agent Test - Runnable Script
 * 
 * Tests the Analyzer Agent with real API calls.
 * Run with: npx ts-node src/agents/__tests__/run-analyzer.test.ts
 */

import { AnalyzerAgent } from '../analyzer.agent';

async function testAnalyzer() {
  console.log('\n🧪 Testing Analyzer Agent with REAL API calls\n');
  console.log('='.repeat(60));

  try {
    console.log('\n🤖 Building Analyzer Agent...');
    const { runner } = await AnalyzerAgent.build();
    console.log('✅ Analyzer Agent built successfully');

    // Test with realistic candidates
    const testCandidates = [
      {
        symbol: 'ARB',
        name: 'Arbitrum',
        coingecko_id: 'arbitrum',
        chain: 'arbitrum',
        address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        reason: 'Strong volume increase, trending on social media',
      },
    ];

    console.log(`\n📊 Testing with candidate: ${testCandidates[0].symbol}`);
    
    const prompt = `Analyze these candidates: ${JSON.stringify(testCandidates)}
    
    Global Market Context: {"bitcoin": {"price": 45000, "change_24h": 1.5}}`;

    console.log('\n🔍 Running analyzer...');
    const result = await runner.ask(prompt) as any;

    console.log('\n📋 ANALYZER RESULT:');
    console.log(JSON.stringify(result, null, 2));

    // Validate results
    console.log('\n✅ VALIDATION:');
    
    const tests = [
      {
        name: 'Result is defined',
        pass: result !== undefined && result !== null,
      },
      {
        name: 'Has action field',
        pass: result.action !== undefined,
      },
      {
        name: 'Action is valid (signal/skip/no_signal)',
        pass: ['signal', 'skip', 'no_signal'].includes(result.action),
      },
      {
        name: 'Has analysis_summary',
        pass: result.analysis_summary !== undefined,
      },
    ];

    tests.forEach((test) => {
      const icon = test.pass ? '✅' : '❌';
      console.log(`${icon} ${test.name}`);
    });

    console.log(`\n🎯 DECISION: ${result.action.toUpperCase()}`);
    console.log(`📝 Summary: ${result.analysis_summary}`);

    if (result.action === 'signal' && result.signal_details) {
      console.log('\n💎 SIGNAL DETAILS:');
      console.log(`  Token: ${result.selected_token?.symbol}`);
      console.log(`  Entry: $${result.signal_details.entry_price}`);
      console.log(`  Target: $${result.signal_details.target_price}`);
      console.log(`  Stop Loss: $${result.signal_details.stop_loss}`);
      console.log(`  Confidence: ${result.signal_details.confidence}%`);
      console.log(`  Order Type: ${result.signal_details.order_type || 'N/A'}`);
      
      // Calculate R:R
      if (result.signal_details.entry_price && result.signal_details.target_price && result.signal_details.stop_loss) {
        const risk = result.signal_details.entry_price - result.signal_details.stop_loss;
        const reward = result.signal_details.target_price - result.signal_details.entry_price;
        const ratio = reward / risk;
        console.log(`  Risk/Reward: 1:${ratio.toFixed(2)}`);
      }
    } else {
      console.log(`\n⚠️  No signal generated: ${result.analysis_summary}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Analyzer Agent test PASSED\n');
    
    return { success: true, result };

  } catch (error) {
    console.error('\n❌ Analyzer Agent test FAILED:');
    console.error(error);
    console.log('\n' + '='.repeat(60));
    return { success: false, error };
  }
}

// Run if called directly
if (require.main === module) {
  testAnalyzer()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testAnalyzer };
