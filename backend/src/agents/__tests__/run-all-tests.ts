/**
 * RUN ALL AGENT TESTS
 * 
 * Orchestrates all test runs in sequence.
 * Run with: npx ts-node src/agents/__tests__/run-all-tests.ts
 */

import { testScanner } from './run-scanner.test';
import { testAnalyzer } from './run-analyzer.test';

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 RUNNING ALL AGENT TESTS');
  console.log('='.repeat(70));

  const results: any[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  // Test 1: Scanner
  console.log('\n\n📍 TEST 1/2: Scanner Agent');
  const scannerResult = await testScanner();
  results.push({ name: 'Scanner Agent', ...scannerResult });
  if (scannerResult.success) totalPassed++;
  else totalFailed++;

  // Test 2: Analyzer  
  console.log('\n\n📍 TEST 2/2: Analyzer Agent');
  const analyzerResult = await testAnalyzer();
  results.push({ name: 'Analyzer Agent', ...analyzerResult });
  if (analyzerResult.success) totalPassed++;
  else totalFailed++;

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });

  console.log(`\n✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📊 Total:  ${results.length}`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
  } else {
    console.log(`\n⚠️  ${totalFailed} test(s) failed`);
  }

  console.log('='.repeat(70) + '\n');

  return {
    totalPassed,
    totalFailed,
    results,
  };
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then((summary) => {
      process.exit(summary.totalFailed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error running tests:', error);
      process.exit(1);
    });
}

export { runAllTests };
