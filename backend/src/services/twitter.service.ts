import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { rateLimitTracker } from './rate-limit-tracker.service';

/**
 * X API v2 Service
 * Uses official X API with OAuth 1.0a User Context authentication
 * Endpoint: POST https://api.x.com/2/tweets
 */
class TwitterService {
  private readonly baseUrl = 'https://api.x.com/2/tweets';
  private lastPostTime: number = 0;
  private minPostIntervalMs: number = 5 * 60 * 1000; // Minimum 5 minutes between posts
  private proxyAgent: HttpsProxyAgent<string> | undefined;

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

    // Setup proxy if PROXY env var is set
    if (config.PROXY) {
      // Format: IP:PORT:USERNAME:PASSWORD or http://username:password@ip:port
      const proxyStr = config.PROXY;
      
      // Parse the proxy string
      let proxyUrl: string;
      if (proxyStr.includes('@')) {
        // Already in URL format: http://user:pass@ip:port
        proxyUrl = proxyStr.startsWith('http') ? proxyStr : `http://${proxyStr}`;
      } else if (proxyStr.split(':').length === 4) {
        // Format: IP:PORT:USERNAME:PASSWORD
        const [ip, port, username, password] = proxyStr.split(':');
        proxyUrl = `http://${username}:${password}@${ip}:${port}`;
      } else {
        // Simple format: IP:PORT
        proxyUrl = `http://${proxyStr}`;
      }

      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
      logger.info(`✅ X API proxy configured: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`);
    }

    // Initialize rate limit tracker from database
    rateLimitTracker.initialize().catch((err: any) => 
      logger.error('Failed to initialize rate limit tracker:', err)
    );
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

    // Check rate limit tracker FIRST - don't even attempt if we're rate limited
    const rateLimitCheck = rateLimitTracker.canPost();
    if (!rateLimitCheck.allowed) {
      const waitHours = Math.floor(rateLimitCheck.waitMinutes! / 60);
      const waitMins = rateLimitCheck.waitMinutes! % 60;
      logger.warn(`Skipping post - X API rate limited until ${rateLimitCheck.resumeAt?.toISOString()}`, {
        reason: rateLimitCheck.reason,
        waitTime: `${waitHours}h ${waitMins}m`,
        resumeAt: rateLimitCheck.resumeAt
      });
      return null;
    }

    // Check self-imposed rate limiting (minimum interval between posts)
    if (!this.checkRateLimit()) {
      logger.warn('Self-imposed rate limit active. Skipping post to avoid spam detection.');
      return null;
    }

    // Add human-like delay before posting
    await this.addHumanLikeDelay();

    // Custom retry logic - don't retry on auth errors OR rate limits
    const shouldRetryFn = (error: any) => {
      const msg = error?.message || '';
      // Don't retry auth errors
      if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden')) {
        return false;
      }
      // Don't retry rate limit errors (429) - it won't help and wastes quota
      if (msg.includes('Rate limit hit') || msg.includes('429')) {
        return false;
      }
      return true;
    };

    return retry(async () => {
      try {
        const authHeader = this.generateOAuthHeader('POST', this.baseUrl);

        const fetchOptions: RequestInit = {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        };

        // Add proxy agent if configured
        if (this.proxyAgent) {
          (fetchOptions as any).agent = this.proxyAgent;
        }

        const response = await fetch(this.baseUrl, fetchOptions);

        const data = await response.json().catch(() => ({}));

        // Update rate limit tracker from response headers (success or failure)
        await rateLimitTracker.updateFromHeaders(response.headers);

        if (!response.ok) {
          if (response.status === 429) {
            // Extract rate limit information from headers
            const rateLimitInfo: any = {
              status: 429,
              error: data
            };

            // Capture all rate limit headers
            const headers = [
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

            headers.forEach(header => {
              const value = response.headers.get(header);
              if (value) {
                rateLimitInfo[header] = value;
                // Convert reset timestamps to readable dates
                if (header.includes('reset')) {
                  const resetTime = new Date(parseInt(value) * 1000);
                  rateLimitInfo[`${header}_readable`] = resetTime.toISOString();
                }
              }
            });

            logger.warn('X API rate limit hit (429) - Skipping post to preserve quota', rateLimitInfo);
            // Return null instead of throwing - skip this post entirely
            return null;
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
          
          // Capture rate limit info on success too
          const rateLimitInfo: any = {
            status: 200,
            tweetId: data.data.id
          };

          const headers = [
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

          headers.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
              rateLimitInfo[header] = value;
              if (header.includes('reset')) {
                const resetTime = new Date(parseInt(value) * 1000);
                rateLimitInfo[`${header}_readable`] = resetTime.toISOString();
              }
            }
          });

          logger.info('Tweet posted successfully via X API v2', rateLimitInfo);
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
