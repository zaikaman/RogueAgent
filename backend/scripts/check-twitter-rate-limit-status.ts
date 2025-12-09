/**
 * Check X API rate limit status WITHOUT posting.
 * This script makes a GET request to check credentials and rate limit info.
 * 
 * Usage:
 *   npx ts-node scripts/check-twitter-rate-limit-status.ts
 *   
 * On Heroku:
 *   heroku run "cd backend && npx ts-node scripts/check-twitter-rate-limit-status.ts" --app rogue-backend
 */

import 'dotenv/config';
import { config } from '../src/config/env.config';
import crypto from 'crypto';

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
function generateOAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
  const oauthParams: Record<string, string> = {
    ...params,
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

  // Only include oauth_* params in header, not query params
  const headerParams = Object.keys(oauthParams)
    .filter(key => key.startsWith('oauth_'))
    .sort();

  return 'OAuth ' + headerParams
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
}

async function checkRateLimitStatus() {
  console.log('=== X API Rate Limit Status Check ===\n');
  console.log(`Check Time: ${new Date().toISOString()}\n`);

  // Check credentials
  console.log('Credentials:');
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

  // Check rate limit status using /2/tweets/search/recent endpoint (no posting)
  // This endpoint exists and will return rate limit headers
  console.log('\nChecking rate limit status via API...\n');
  
  // Use the rate limit status endpoint
  const url = 'https://api.x.com/1.1/application/rate_limit_status.json?resources=statuses';
  
  try {
    const authHeader = generateOAuthHeader('GET', url.split('?')[0], {
      resources: 'statuses'
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    console.log(`Response Status: ${response.status} ${response.statusText}\n`);

    // Get all headers
    console.log('Response Headers:');
    const allHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      allHeaders[key] = value;
      console.log(`  ${key}: ${value}`);
    });

    console.log('\nRate Limit Headers:');
    const rateLimitHeaders = [
      'x-rate-limit-limit',
      'x-rate-limit-remaining',
      'x-rate-limit-reset',
      'x-app-limit-24hour-limit',
      'x-app-limit-24hour-remaining', 
      'x-app-limit-24hour-reset',
      'x-user-limit-24hour-limit',
      'x-user-limit-24hour-remaining',
      'x-user-limit-24hour-reset'
    ];

    let foundAny = false;
    rateLimitHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        foundAny = true;
        console.log(`  ${header}: ${value}`);
        if (header.includes('reset')) {
          const resetTime = new Date(parseInt(value) * 1000);
          const now = new Date();
          const minutesUntilReset = Math.round((resetTime.getTime() - now.getTime()) / 60000);
          console.log(`    → Resets at: ${resetTime.toISOString()} (in ${minutesUntilReset} minutes)`);
        }
      }
    });

    if (!foundAny) {
      console.log('  (No rate limit headers found)');
    }

    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    console.log('\nResponse Body:');
    console.log(JSON.stringify(jsonData, null, 2));

    // Check for tweet creation limits specifically
    if (jsonData.resources?.statuses) {
      console.log('\n=== TWEET CREATION LIMITS ===');
      const tweetStatus = jsonData.resources.statuses['/statuses/update'];
      if (tweetStatus) {
        console.log('Endpoint: /statuses/update (tweet posting)');
        console.log(`  Limit: ${tweetStatus.limit}`);
        console.log(`  Remaining: ${tweetStatus.remaining}`);
        console.log(`  Reset: ${new Date(tweetStatus.reset * 1000).toISOString()}`);
        
        if (tweetStatus.remaining === 0) {
          const resetTime = new Date(tweetStatus.reset * 1000);
          const now = new Date();
          const minutesUntilReset = Math.round((resetTime.getTime() - now.getTime()) / 60000);
          console.log(`\n⚠️  RATE LIMITED! Can post again in ${minutesUntilReset} minutes.`);
        } else {
          console.log(`\n✅ ${tweetStatus.remaining} posts remaining.`);
        }
      }
    }

  } catch (error: any) {
    console.error('\n❌ Request failed:', error.message);
    process.exit(1);
  }

  console.log('\n=== Check Complete ===\n');
}

checkRateLimitStatus();
