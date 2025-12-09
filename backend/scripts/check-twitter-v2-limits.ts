/**
 * Check X API v2 tweet creation rate limits.
 * Makes actual POST requests to see rate limit headers (using test content).
 * 
 * IMPORTANT: This will attempt to post a test tweet to check limits.
 * The tweet will be posted if not rate limited.
 * 
 * Usage:
 *   npx ts-node scripts/check-twitter-v2-limits.ts
 *   
 * On Heroku:
 *   heroku run "cd backend && npx ts-node scripts/check-twitter-v2-limits.ts" --app rogue-backend
 */

import 'dotenv/config';
import { config } from '../src/config/env.config';
import crypto from 'crypto';

// Set to false to do a real post, true to just check (but may not show all headers)
const DRY_RUN = false;

const TEST_MESSAGE = `🔍 Rate limit diagnostic ${new Date().toISOString().slice(11, 19)}`;

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

async function checkV2Limits() {
  console.log('=== X API v2 Tweet Creation Limits Check ===\n');
  console.log(`Check Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no actual post)' : 'LIVE (will post test tweet)'}\n`);

  // Check credentials
  if (!config.X_API_KEY || !config.X_API_KEY_SECRET || !config.X_ACCESS_TOKEN || !config.X_ACCESS_TOKEN_SECRET) {
    console.error('❌ Missing required credentials. Exiting.');
    process.exit(1);
  }

  console.log('✅ All credentials present\n');

  // Make request to v2 tweets endpoint
  const url = 'https://api.x.com/2/tweets';
  const authHeader = generateOAuthHeader('POST', url);

  console.log(`Making POST request to: ${url}`);
  console.log(`Message: "${TEST_MESSAGE}"\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: TEST_MESSAGE })
    });

    console.log(`\n📊 RESPONSE STATUS: ${response.status} ${response.statusText}\n`);

    // Extract ALL headers
    console.log('📋 ALL RESPONSE HEADERS:');
    console.log('─'.repeat(60));
    const headerMap: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerMap[key] = value;
      console.log(`${key}: ${value}`);
    });
    console.log('─'.repeat(60));

    // Focus on rate limit headers
    console.log('\n🚦 RATE LIMIT SPECIFIC HEADERS:');
    console.log('─'.repeat(60));
    
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

    const foundHeaders: Record<string, string> = {};
    rateLimitHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        foundHeaders[header] = value;
        console.log(`${header}: ${value}`);
        
        if (header.includes('reset')) {
          const resetTime = new Date(parseInt(value) * 1000);
          const now = new Date();
          const minutesUntil = Math.round((resetTime.getTime() - now.getTime()) / 60000);
          const hoursUntil = Math.round(minutesUntil / 60);
          console.log(`  → Resets: ${resetTime.toISOString()}`);
          console.log(`  → In: ${hoursUntil > 0 ? `${hoursUntil}h ${minutesUntil % 60}m` : `${minutesUntil}m`}`);
        }
      }
    });

    if (Object.keys(foundHeaders).length === 0) {
      console.log('(No rate limit headers found - API may not return them on success)');
    }
    console.log('─'.repeat(60));

    // Parse response body
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    console.log('\n📄 RESPONSE BODY:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(data, null, 2));
    console.log('─'.repeat(60));

    // Analysis
    console.log('\n📈 ANALYSIS:');
    console.log('─'.repeat(60));

    if (response.status === 200 || response.status === 201) {
      console.log('✅ SUCCESS - Tweet posted successfully!');
      if (data.data?.id) {
        console.log(`   Tweet ID: ${data.data.id}`);
        console.log(`   View at: https://x.com/i/status/${data.data.id}`);
      }
      
      // Check if we got any rate limit info
      if (Object.keys(foundHeaders).length > 0) {
        console.log('\n📊 Rate Limit Status:');
        if (foundHeaders['x-rate-limit-remaining']) {
          console.log(`   Window Remaining: ${foundHeaders['x-rate-limit-remaining']}/${foundHeaders['x-rate-limit-limit']}`);
        }
        if (foundHeaders['x-app-limit-24hour-remaining']) {
          console.log(`   24h App Remaining: ${foundHeaders['x-app-limit-24hour-remaining']}/${foundHeaders['x-app-limit-24hour-limit']}`);
        }
        if (foundHeaders['x-user-limit-24hour-remaining']) {
          console.log(`   24h User Remaining: ${foundHeaders['x-user-limit-24hour-remaining']}/${foundHeaders['x-user-limit-24hour-limit']}`);
        }
      } else {
        console.log('\n⚠️  No rate limit headers returned (common on success)');
        console.log('   Try this script again when hitting 429 errors to see limit details');
      }

    } else if (response.status === 429) {
      console.log('⚠️  RATE LIMITED (429) - This is what you\'re experiencing!');
      console.log('\n🔍 Rate Limit Details:');
      
      if (foundHeaders['x-rate-limit-remaining'] !== undefined) {
        console.log(`   Window: ${foundHeaders['x-rate-limit-remaining']}/${foundHeaders['x-rate-limit-limit']} remaining`);
      }
      
      if (foundHeaders['x-app-limit-24hour-remaining'] !== undefined) {
        const remaining = foundHeaders['x-app-limit-24hour-remaining'];
        const limit = foundHeaders['x-app-limit-24hour-limit'];
        console.log(`   24h App Limit: ${remaining}/${limit} remaining`);
        if (remaining === '0') {
          console.log('   ❌ APP 24-HOUR LIMIT EXHAUSTED!');
        }
      }
      
      if (foundHeaders['x-user-limit-24hour-remaining'] !== undefined) {
        const remaining = foundHeaders['x-user-limit-24hour-remaining'];
        const limit = foundHeaders['x-user-limit-24hour-limit'];
        console.log(`   24h User Limit: ${remaining}/${limit} remaining`);
        if (remaining === '0') {
          console.log('   ❌ USER 24-HOUR LIMIT EXHAUSTED!');
        }
      }

      // Error details
      if (data.errors && Array.isArray(data.errors)) {
        console.log('\n📝 Error Messages:');
        data.errors.forEach((err: any, idx: number) => {
          console.log(`   ${idx + 1}. ${err.message || err.title || JSON.stringify(err)}`);
        });
      }

      if (data.detail) {
        console.log(`\n   Detail: ${data.detail}`);
      }

    } else if (response.status === 403) {
      console.log('❌ FORBIDDEN (403)');
      console.log('   Your app may not have write permissions.');
      console.log('   Check Developer Portal settings.');
    } else if (response.status === 401) {
      console.log('❌ UNAUTHORIZED (401)');
      console.log('   OAuth credentials invalid or expired.');
    } else {
      console.log(`⚠️  UNEXPECTED STATUS: ${response.status}`);
    }

    console.log('─'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ REQUEST FAILED:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error(`\n   Stack: ${error.stack}`);
    }
  }

  console.log('\n=== Check Complete ===\n');
}

checkV2Limits();
