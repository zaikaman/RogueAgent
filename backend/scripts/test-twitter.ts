/**
 * Test script to verify X API v2 posting with OAuth 1.0a User Context.
 * 
 * Usage:
 *   cd backend
 *   npx ts-node scripts/test-twitter.ts
 * 
 * This will attempt to post a test tweet. Edit TEST_MESSAGE below if desired.
 */

import 'dotenv/config';
import { config } from '../src/config/env.config';
import crypto from 'crypto';

const TEST_MESSAGE = `🧪 RogueAgent test tweet - ${new Date().toISOString().slice(0, 19)}Z`;

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

async function testTwitterPost() {
  console.log('=== X API v2 Posting Test (OAuth 1.0a) ===\n');

  // 1. Check env vars
  console.log('1. Checking environment variables...');
  
  if (!config.X_API_KEY) {
    console.error('❌ Missing X_API_KEY');
    process.exit(1);
  }
  console.log('   ✅ X_API_KEY present');

  if (!config.X_API_KEY_SECRET) {
    console.error('❌ Missing X_API_KEY_SECRET');
    process.exit(1);
  }
  console.log('   ✅ X_API_KEY_SECRET present');

  if (!config.X_ACCESS_TOKEN) {
    console.error('❌ Missing X_ACCESS_TOKEN');
    process.exit(1);
  }
  console.log('   ✅ X_ACCESS_TOKEN present');

  if (!config.X_ACCESS_TOKEN_SECRET) {
    console.error('❌ Missing X_ACCESS_TOKEN_SECRET');
    process.exit(1);
  }
  console.log('   ✅ X_ACCESS_TOKEN_SECRET present');

  // 2. Attempt to post using X API v2 with OAuth 1.0a
  console.log('\n2. Attempting to post test tweet via X API v2 (OAuth 1.0a)...');
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

    const data = await response.json().catch(() => ({}));

    console.log(`\n   HTTP Status: ${response.status}`);
    console.log('   Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`\n❌ Request failed with status ${response.status}`);
      
      if (response.status === 401) {
        console.error('   → Unauthorized. Check your OAuth credentials.');
      } else if (response.status === 403) {
        console.error('   → Forbidden. Your app may not have write permissions.');
        console.error('   → Make sure your app has "Read and Write" permissions in the X Developer Portal.');
      } else if (response.status === 429) {
        console.error('   → Rate limit hit. Wait and try again.');
      }
      
      process.exit(1);
    }

    if (data.data && data.data.id) {
      console.log(`\n✅ SUCCESS! Tweet posted with ID: ${data.data.id}`);
      console.log(`   View at: https://x.com/i/status/${data.data.id}`);
      process.exit(0);
    } else {
      console.error(`\n❌ Unexpected response format:`, data);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Request failed:', error.message);
    process.exit(1);
  }
}

testTwitterPost();
