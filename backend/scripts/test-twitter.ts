/**
 * Test script to verify Twitter posting with current cookies.
 * 
 * Usage:
 *   cd backend
 *   npx ts-node scripts/test-twitter.ts
 * 
 * This will attempt to post a test tweet. Edit TEST_MESSAGE below if desired.
 */

import 'dotenv/config';
import { config } from '../src/config/env.config';

const TEST_MESSAGE = `🧪 RogueAgent test tweet - ${new Date().toISOString().slice(0, 19)}Z`;

async function testTwitterPost() {
  console.log('=== Twitter Posting Test ===\n');

  // 1. Check env vars
  console.log('1. Checking environment variables...');
  
  const apiKey = config.TWITTERIO_API_KEY || (config as any).TWITTER_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing TWITTERIO_API_KEY or TWITTER_API_KEY');
    process.exit(1);
  }
  console.log('   ✅ API key present');

  if (!config.TWITTER_LOGIN_COOKIES) {
    console.error('❌ Missing TWITTER_LOGIN_COOKIES');
    process.exit(1);
  }
  console.log('   ✅ TWITTER_LOGIN_COOKIES present');

  if (!config.TWITTER_PROXY) {
    console.warn('   ⚠️  TWITTER_PROXY not set (may still work)');
  } else {
    console.log('   ✅ TWITTER_PROXY present');
  }

  // 2. Decode and inspect cookies
  console.log('\n2. Decoding cookies...');
  try {
    const decoded = Buffer.from(config.TWITTER_LOGIN_COOKIES, 'base64').toString('utf8');
    const cookies = JSON.parse(decoded);
    const keys = Object.keys(cookies);
    console.log(`   ✅ Decoded ${keys.length} cookies: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
    
    if (!cookies.auth_token) {
      console.error('   ❌ Missing auth_token in cookies!');
      process.exit(1);
    }
    if (!cookies.ct0) {
      console.error('   ❌ Missing ct0 in cookies!');
      process.exit(1);
    }
    console.log('   ✅ auth_token and ct0 present');
  } catch (e) {
    console.error('   ❌ Failed to decode cookies:', e);
    process.exit(1);
  }

  // 3. Attempt to post
  console.log('\n3. Attempting to post test tweet...');
  console.log(`   Message: "${TEST_MESSAGE}"`);
  
  const baseUrl = 'https://api.twitterapi.io/twitter';
  const url = `${baseUrl}/create_tweet_v2`;

  // The API expects the base64-encoded JSON string directly (containing only auth_token and ct0)
  const body = {
    login_cookies: config.TWITTER_LOGIN_COOKIES,
    tweet_text: TEST_MESSAGE,
    proxy: config.TWITTER_PROXY || undefined
  };

  console.log('\n   Sending base64 cookie string directly...');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    console.log(`\n   HTTP Status: ${response.status}`);
    console.log('   Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`\n❌ Request failed with status ${response.status}`);
      
      if (response.status === 429) {
        console.error('   → Rate limit hit. Wait and try again.');
      }
      
      process.exit(1);
    }

    if (data.status === 'success') {
      console.log(`\n✅ SUCCESS! Tweet posted with ID: ${data.tweet_id}`);
      console.log(`   View at: https://x.com/i/status/${data.tweet_id}`);
      process.exit(0);
    } else {
      const errorMsg = JSON.stringify(data.msg || data.message || data);
      
      if (errorMsg.includes('226') || errorMsg.includes('automated') || errorMsg.includes('spam')) {
        console.error('\n❌ SPAM DETECTION (Error 226)');
        console.error('   Twitter flagged this as automated. You need to:');
        console.error('   1. Get fresh cookies (re-login to Twitter)');
        console.error('   2. Use a different/better residential proxy');
        console.error('   3. Wait a few hours before retrying');
      } else {
        console.error(`\n❌ API returned error: ${errorMsg}`);
      }
      
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Request failed:', error.message);
    process.exit(1);
  }
}

testTwitterPost();
