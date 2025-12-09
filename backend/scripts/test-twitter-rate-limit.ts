/**
 * Test script to debug X API rate limit issues.
 * 
 * This script will:
 * 1. Check your credentials
 * 2. Make a test request to post a tweet
 * 3. Show ALL response headers including rate limit info
 * 4. Display the actual error response when hitting limits
 * 
 * Usage:
 *   cd backend
 *   npx ts-node scripts/test-twitter-rate-limit.ts
 */

import 'dotenv/config';
import { config } from '../src/config/env.config';
import crypto from 'crypto';

const TEST_MESSAGE = `🧪 Rate limit test - ${new Date().toISOString().slice(0, 19)}Z`;

/**
 * Percent encode a string according to RFC 3986
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Generate OAuth 1.0a signature
 */
function generateOAuthSignature(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
    .join('&');

  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams)
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
}

/**
 * Generate OAuth 1.0a Authorization header
 */
function generateOAuthHeader(method: string, url: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.X_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.X_ACCESS_TOKEN!,
    oauth_version: '1.0'
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    config.X_API_KEY_SECRET!,
    config.X_ACCESS_TOKEN_SECRET!
  );

  oauthParams.oauth_signature = signature;

  return 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
}

async function testRateLimit() {
  console.log('=== X API Rate Limit Debug Test ===\n');
  console.log(`Test Time: ${new Date().toISOString()}\n`);

  // 1. Check credentials
  console.log('1. Checking credentials...');
  const creds = {
    X_API_KEY: config.X_API_KEY ? '✅ Present' : '❌ Missing',
    X_API_KEY_SECRET: config.X_API_KEY_SECRET ? '✅ Present' : '❌ Missing',
    X_ACCESS_TOKEN: config.X_ACCESS_TOKEN ? '✅ Present' : '❌ Missing',
    X_ACCESS_TOKEN_SECRET: config.X_ACCESS_TOKEN_SECRET ? '✅ Present' : '❌ Missing'
  };
  console.table(creds);

  if (!config.X_API_KEY || !config.X_API_KEY_SECRET || !config.X_ACCESS_TOKEN || !config.X_ACCESS_TOKEN_SECRET) {
    console.error('\n❌ Missing required credentials. Exiting.');
    process.exit(1);
  }

  // 2. Make request and capture ALL response details
  console.log('\n2. Making POST request to X API...');
  console.log(`   Message: "${TEST_MESSAGE}"`);
  
  const url = 'https://api.x.com/2/tweets';
  const authHeader = generateOAuthHeader('POST', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: TEST_MESSAGE })
    });

    // Capture all headers
    console.log('\n3. RESPONSE HEADERS:');
    console.log('   ================');
    const headerObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerObj[key] = value;
      console.log(`   ${key}: ${value}`);
    });

    // Look for rate limit specific headers
    console.log('\n4. RATE LIMIT HEADERS (if present):');
    console.log('   ================================');
    const rateLimitHeaders = [
      'x-rate-limit-limit',
      'x-rate-limit-remaining',
      'x-rate-limit-reset',
      'x-app-limit-24hour-limit',
      'x-app-limit-24hour-remaining',
      'x-app-limit-24hour-reset',
      'x-user-limit-24hour-limit',
      'x-user-limit-24hour-remaining',
      'x-user-limit-24hour-reset',
      'retry-after'
    ];

    let foundRateLimit = false;
    rateLimitHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        foundRateLimit = true;
        console.log(`   ${header}: ${value}`);
        
        // Convert timestamp to readable date if it's a reset header
        if (header.includes('reset')) {
          const resetTime = new Date(parseInt(value) * 1000);
          console.log(`   → Resets at: ${resetTime.toISOString()} (${resetTime.toLocaleString()})`);
        }
      }
    });

    if (!foundRateLimit) {
      console.log('   No rate limit headers found in response.');
    }

    // Get response body
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    console.log('\n5. HTTP STATUS:', response.status, response.statusText);
    
    console.log('\n6. RESPONSE BODY:');
    console.log('   =============');
    console.log(JSON.stringify(data, null, 2));

    // Analyze the response
    console.log('\n7. ANALYSIS:');
    console.log('   =========');

    if (response.status === 200 || response.status === 201) {
      console.log('   ✅ SUCCESS - Tweet posted!');
      if (data.data && data.data.id) {
        console.log(`   Tweet ID: ${data.data.id}`);
        console.log(`   View at: https://x.com/i/status/${data.data.id}`);
      }
    } else if (response.status === 429) {
      console.log('   ⚠️  RATE LIMIT HIT (429)');
      console.log('   This is the error you\'re experiencing.');
      
      // Check for error details
      if (data.errors && Array.isArray(data.errors)) {
        console.log('\n   Error Details:');
        data.errors.forEach((err: any, idx: number) => {
          console.log(`   Error ${idx + 1}:`);
          console.log(`     Message: ${err.message || 'N/A'}`);
          console.log(`     Type: ${err.type || 'N/A'}`);
          console.log(`     Title: ${err.title || 'N/A'}`);
        });
      }

      if (data.detail) {
        console.log(`\n   Detail: ${data.detail}`);
      }

      if (data.title) {
        console.log(`   Title: ${data.title}`);
      }

      // Calculate wait time
      const retryAfter = response.headers.get('retry-after');
      const resetHeader = response.headers.get('x-rate-limit-reset') || 
                          response.headers.get('x-app-limit-24hour-reset') ||
                          response.headers.get('x-user-limit-24hour-reset');
      
      if (retryAfter) {
        console.log(`\n   ⏰ Retry After: ${retryAfter} seconds (${Math.round(parseInt(retryAfter) / 60)} minutes)`);
      } else if (resetHeader) {
        const resetTime = new Date(parseInt(resetHeader) * 1000);
        const waitMs = resetTime.getTime() - Date.now();
        const waitMinutes = Math.round(waitMs / 60000);
        const waitHours = Math.round(waitMinutes / 60);
        console.log(`\n   ⏰ Wait until: ${resetTime.toLocaleString()}`);
        console.log(`   ⏰ Time to wait: ${waitHours > 0 ? `${waitHours} hours` : `${waitMinutes} minutes`}`);
      }
    } else if (response.status === 403) {
      console.log('   ❌ FORBIDDEN (403)');
      console.log('   Your app may not have write permissions.');
      console.log('   Check X Developer Portal → Your App → Settings → User authentication settings');
      console.log('   Make sure "Read and Write" permissions are enabled.');
    } else if (response.status === 401) {
      console.log('   ❌ UNAUTHORIZED (401)');
      console.log('   OAuth credentials are invalid or expired.');
    } else {
      console.log(`   ⚠️  UNEXPECTED STATUS: ${response.status}`);
    }

  } catch (error: any) {
    console.error('\n❌ REQUEST FAILED:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }

  console.log('\n=== Test Complete ===\n');
}

testRateLimit();
