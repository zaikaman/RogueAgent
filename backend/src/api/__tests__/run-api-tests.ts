/**
 * REAL API Integration Tests - Runnable Script
 * 
 * Tests actual API endpoints with real HTTP requests.
 * Run with: npx ts-node src/api/__tests__/run-api-tests.ts
 */

import request from 'supertest';
import { createServer } from '../../server';

const app = createServer();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 RUNNING API INTEGRATION TESTS');
  console.log('='.repeat(70));

  const results: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  // Test 1: Health Endpoint
  console.log('\n\n📍 TEST 1: Health Endpoint');
  console.log('-'.repeat(70));
  try {
    const response = await request(app).get('/api/health');
    
    const checks = [
      { name: 'Returns JSON', pass: response.headers['content-type']?.includes('json') },
      { name: 'Has status field', pass: response.body.status !== undefined },
      { name: 'Has timestamp', pass: response.body.timestamp !== undefined },
      { name: 'Has services.database', pass: response.body.services?.database !== undefined },
      { name: 'Valid timestamp', pass: !isNaN(Date.parse(response.body.timestamp)) },
    ];

    const allPassed = checks.every(c => c.pass);
    
    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    console.log('\n  Response:', JSON.stringify(response.body, null, 2));

    results.push({
      name: 'Health Endpoint',
      passed: allPassed,
      details: response.body
    });

    if (allPassed) totalPassed++;
    else totalFailed++;

  } catch (error: any) {
    console.log('  ❌ Test failed:', error.message);
    results.push({
      name: 'Health Endpoint',
      passed: false,
      error: error.message
    });
    totalFailed++;
  }

  // Test 2: Root Endpoint
  console.log('\n\n📍 TEST 2: Root Endpoint');
  console.log('-'.repeat(70));
  try {
    const response = await request(app).get('/');
    
    const checks = [
      { name: 'Returns 200', pass: response.status === 200 },
      { name: 'Has service field', pass: response.body.service !== undefined },
      { name: 'Has version field', pass: response.body.version !== undefined },
      { name: 'Service is Rogue Agent', pass: response.body.service === 'Rogue Agent Backend' },
      { name: 'Status is running', pass: response.body.status === 'running' },
    ];

    const allPassed = checks.every(c => c.pass);
    
    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    console.log('\n  Response:', JSON.stringify(response.body, null, 2));

    results.push({
      name: 'Root Endpoint',
      passed: allPassed,
      details: response.body
    });

    if (allPassed) totalPassed++;
    else totalFailed++;

  } catch (error: any) {
    console.log('  ❌ Test failed:', error.message);
    results.push({
      name: 'Root Endpoint',
      passed: false,
      error: error.message
    });
    totalFailed++;
  }

  // Test 3: Signals Endpoint - Basic
  console.log('\n\n📍 TEST 3: Signals Endpoint (Basic)');
  console.log('-'.repeat(70));
  try {
    const response = await request(app).get('/api/signals/history');
    
    const checks = [
      { name: 'Returns 200', pass: response.status === 200 },
      { name: 'Has data array', pass: Array.isArray(response.body.data) },
      { name: 'Has pagination', pass: response.body.pagination !== undefined },
      { name: 'Pagination has page', pass: response.body.pagination?.page !== undefined },
      { name: 'Pagination has total', pass: response.body.pagination?.total !== undefined },
    ];

    const allPassed = checks.every(c => c.pass);
    
    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    console.log(`\n  Found ${response.body.data?.length || 0} signals`);
    console.log('  Pagination:', response.body.pagination);

    results.push({
      name: 'Signals Endpoint (Basic)',
      passed: allPassed,
      details: { count: response.body.data?.length, pagination: response.body.pagination }
    });

    if (allPassed) totalPassed++;
    else totalFailed++;

  } catch (error: any) {
    console.log('  ❌ Test failed:', error.message);
    results.push({
      name: 'Signals Endpoint (Basic)',
      passed: false,
      error: error.message
    });
    totalFailed++;
  }

  // Test 4: Signals Endpoint - Pagination
  console.log('\n\n📍 TEST 4: Signals Endpoint (Pagination)');
  console.log('-'.repeat(70));
  try {
    const response = await request(app).get('/api/signals/history?page=1&limit=5');
    
    const checks = [
      { name: 'Returns 200', pass: response.status === 200 },
      { name: 'Respects limit', pass: response.body.data?.length <= 5 },
      { name: 'Page is 1', pass: response.body.pagination?.page === 1 },
      { name: 'Limit is 5', pass: response.body.pagination?.limit === 5 },
    ];

    const allPassed = checks.every(c => c.pass);
    
    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    console.log(`\n  Returned ${response.body.data?.length} signals (max 5)`);

    results.push({
      name: 'Signals Endpoint (Pagination)',
      passed: allPassed
    });

    if (allPassed) totalPassed++;
    else totalFailed++;

  } catch (error: any) {
    console.log('  ❌ Test failed:', error.message);
    results.push({
      name: 'Signals Endpoint (Pagination)',
      passed: false,
      error: error.message
    });
    totalFailed++;
  }

  // Test 5: Airdrops Endpoint
  console.log('\n\n📍 TEST 5: Airdrops Endpoint');
  console.log('-'.repeat(70));
  try {
    const response = await request(app).get('/api/airdrops');
    
    const checks = [
      { name: 'Returns 200', pass: response.status === 200 },
      { name: 'Has airdrops array', pass: Array.isArray(response.body.airdrops) },
      { name: 'Has pagination', pass: response.body.pagination !== undefined },
      { name: 'Default page is 1', pass: response.body.pagination?.page === 1 },
      { name: 'Default limit is 10', pass: response.body.pagination?.limit === 10 },
    ];

    const allPassed = checks.every(c => c.pass);
    
    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    console.log(`\n  Found ${response.body.airdrops?.length || 0} airdrops`);
    console.log('  Pagination:', response.body.pagination);

    results.push({
      name: 'Airdrops Endpoint',
      passed: allPassed,
      details: { count: response.body.airdrops?.length, pagination: response.body.pagination }
    });

    if (allPassed) totalPassed++;
    else totalFailed++;

  } catch (error: any) {
    console.log('  ❌ Test failed:', error.message);
    results.push({
      name: 'Airdrops Endpoint',
      passed: false,
      error: error.message
    });
    totalFailed++;
  }

  // Test 6: 404 Handling
  console.log('\n\n📍 TEST 6: 404 Error Handling');
  console.log('-'.repeat(70));
  try {
    const response = await request(app).get('/api/nonexistent');
    
    const checks = [
      { name: 'Returns 404', pass: response.status === 404 },
    ];

    const allPassed = checks.every(c => c.pass);
    
    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    results.push({
      name: '404 Error Handling',
      passed: allPassed
    });

    if (allPassed) totalPassed++;
    else totalFailed++;

  } catch (error: any) {
    console.log('  ❌ Test failed:', error.message);
    results.push({
      name: '404 Error Handling',
      passed: false,
      error: error.message
    });
    totalFailed++;
  }

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📊 Total:  ${results.length}`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL API INTEGRATION TESTS PASSED!');
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
  runTests()
    .then((summary) => {
      process.exit(summary.totalFailed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error running API tests:', error);
      process.exit(1);
    });
}

export { runTests };
