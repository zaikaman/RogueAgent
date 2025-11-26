import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';
import crypto from 'crypto';

/**
 * X API v2 Service
 * Uses official X API with OAuth 1.0a User Context authentication
 * Endpoint: POST https://api.x.com/2/tweets
 */
class TwitterService {
  private readonly baseUrl = 'https://api.x.com/2/tweets';
  private lastPostTime: number = 0;
  private minPostIntervalMs: number = 5 * 60 * 1000; // Minimum 5 minutes between posts

  private get hasCredentials(): boolean {
    return !!(config.X_API_KEY && config.X_API_KEY_SECRET && 
              config.X_ACCESS_TOKEN && config.X_ACCESS_TOKEN_SECRET);
  }

  constructor() {
    if (!this.hasCredentials) {
      logger.warn('⚠️ X API OAuth 1.0a credentials missing. X/Twitter posting will not function.');
      logger.warn('   Required: X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET');
    } else {
      logger.info('✅ X API v2 initialized with OAuth 1.0a User Context');
    }
  }

  /**
   * Percent encode a string according to RFC 3986
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/\*/g, '%2A')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
  }

  /**
   * Generate OAuth 1.0a signature for the request
   */
  private generateOAuthSignature(
    method: string,
    url: string,
    oauthParams: Record<string, string>,
    consumerSecret: string,
    tokenSecret: string
  ): string {
    // Sort and encode parameters
    const sortedParams = Object.keys(oauthParams)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(oauthParams[key])}`)
      .join('&');

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = `${this.percentEncode(consumerSecret)}&${this.percentEncode(tokenSecret)}`;

    // Generate HMAC-SHA1 signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');

    return signature;
  }

  /**
   * Generate OAuth 1.0a Authorization header
   */
  private generateOAuthHeader(method: string, url: string): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.X_API_KEY!,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: config.X_ACCESS_TOKEN!,
      oauth_version: '1.0'
    };

    // Generate signature
    const signature = this.generateOAuthSignature(
      method,
      url,
      oauthParams,
      config.X_API_KEY_SECRET!,
      config.X_ACCESS_TOKEN_SECRET!
    );

    oauthParams.oauth_signature = signature;

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map(key => `${this.percentEncode(key)}="${this.percentEncode(oauthParams[key])}"`)
      .join(', ');

    return authHeader;
  }

  /**
   * Add a random delay to make posting less predictable (helps avoid spam detection)
   */
  private async addHumanLikeDelay(): Promise<void> {
    // Random delay between 2-8 seconds to appear more human-like
    const delay = 2000 + Math.random() * 6000;
    logger.info(`Adding ${Math.round(delay / 1000)}s delay before posting...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Check if enough time has passed since last post
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeSinceLastPost = now - this.lastPostTime;
    if (this.lastPostTime > 0 && timeSinceLastPost < this.minPostIntervalMs) {
      logger.warn(`Only ${Math.round(timeSinceLastPost / 1000)}s since last post. Minimum interval is ${this.minPostIntervalMs / 1000}s.`);
      return false;
    }
    return true;
  }

  /**
   * Post a tweet using the official X API v2 with OAuth 1.0a
   * @param text The tweet text content
   * @returns The tweet ID if successful, null otherwise
   */
  async postTweet(text: string): Promise<string | null> {
    if (!this.hasCredentials) {
      logger.warn('Skipping tweet: X API OAuth 1.0a credentials not configured');
      return null;
    }

    // Check self-imposed rate limiting
    if (!this.checkRateLimit()) {
      logger.warn('Self-imposed rate limit active. Skipping post to avoid spam detection.');
      return null;
    }

    // Add human-like delay before posting
    await this.addHumanLikeDelay();

    // Custom retry logic - don't retry on auth errors
    const shouldRetryFn = (error: any) => {
      const msg = error?.message || '';
      if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden')) {
        return false;
      }
      return true;
    };

    return retry(async () => {
      try {
        const authHeader = this.generateOAuthHeader('POST', this.baseUrl);

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 429) {
            logger.warn('X API rate limit hit (429)');
            throw new Error('Rate limit hit');
          }
          if (response.status === 401) {
            logger.error('X API authentication failed (401). Check your OAuth credentials.');
            throw new Error('Unauthorized: Invalid OAuth credentials');
          }
          if (response.status === 403) {
            logger.error('X API forbidden (403). Your app may not have write permissions.');
            throw new Error('Forbidden: Check app permissions');
          }
          
          const errorDetail = data.detail || data.title || JSON.stringify(data.errors || data);
          logger.error('Failed to post tweet', { status: response.status, error: errorDetail });
          throw new Error(`X API Error (${response.status}): ${errorDetail}`);
        }

        // Success response from X API v2
        if (data.data && data.data.id) {
          this.lastPostTime = Date.now();
          logger.info('Tweet posted successfully via X API v2', { id: data.data.id, text: data.data.text?.substring(0, 50) });
          return data.data.id;
        } else {
          logger.warn('Unexpected response format from X API', data);
          throw new Error('Unexpected response format from X API');
        }
      } catch (error: any) {
        logger.error('Failed to post tweet', error.message);
        throw error;
      }
    }, 3, 1000, 2, shouldRetryFn);
  }
}

export const twitterService = new TwitterService();
