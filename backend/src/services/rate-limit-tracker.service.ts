import { logger } from '../utils/logger.util';
import { supabaseService } from './supabase.service';

/**
 * Tracks X API rate limits and determines when posting can safely resume
 * Persists state to database to survive app restarts
 */
class RateLimitTracker {
  private userLimitResetTime: Date | null = null;
  private appLimitResetTime: Date | null = null;
  private isRateLimited: boolean = false;
  private isInitialized: boolean = false;

  /**
   * Initialize from database on startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const { data, error } = await supabaseService.getClient()
        .from('x_api_rate_limits')
        .select('*')
        .eq('service', 'twitter')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No row exists, create one
          await supabaseService.getClient()
            .from('x_api_rate_limits')
            .insert({ service: 'twitter', is_rate_limited: false });
          logger.info('Initialized X API rate limit tracker in database');
        } else {
          throw error;
        }
      } else if (data) {
        // Load state from database
        this.isRateLimited = data.is_rate_limited;
        this.userLimitResetTime = data.user_limit_reset ? new Date(data.user_limit_reset) : null;
        this.appLimitResetTime = data.app_limit_reset ? new Date(data.app_limit_reset) : null;

        // Check if limits have already reset
        const now = new Date();
        if (this.isRateLimited) {
          const userReset = !this.userLimitResetTime || now >= this.userLimitResetTime;
          const appReset = !this.appLimitResetTime || now >= this.appLimitResetTime;
          
          if (userReset && appReset) {
            this.isRateLimited = false;
            await this.saveToDatabase();
            logger.info('Rate limits have reset since last check - Resuming posts');
          } else {
            const resumeTime = this.getResumeTime();
            const minutesUntil = resumeTime ? Math.round((resumeTime.getTime() - now.getTime()) / 60000) : 0;
            logger.warn('Rate limit state restored from database', {
              resumeAt: resumeTime?.toISOString(),
              minutesUntil
            });
          }
        }
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize rate limit tracker from database:', error);
      this.isInitialized = true; // Continue anyway
    }
  }

  /**
   * Save current state to database
   */
  private async saveToDatabase(): Promise<void> {
    try {
      await supabaseService.getClient()
        .from('x_api_rate_limits')
        .upsert({
          service: 'twitter',
          user_limit_reset: this.userLimitResetTime?.toISOString(),
          app_limit_reset: this.appLimitResetTime?.toISOString(),
          is_rate_limited: this.isRateLimited,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'service'
        });
    } catch (error) {
      logger.error('Failed to save rate limit state to database:', error);
    }
  }

  /**
   * Update rate limit info from X API response headers
   */
  async updateFromHeaders(headers: Headers): Promise<void> {
    const userRemaining = headers.get('x-user-limit-24hour-remaining');
    const userReset = headers.get('x-user-limit-24hour-reset');
    const appRemaining = headers.get('x-app-limit-24hour-remaining');
    const appReset = headers.get('x-app-limit-24hour-reset');

    let stateChanged = false;

    // Update reset times
    if (userReset) {
      this.userLimitResetTime = new Date(parseInt(userReset) * 1000);
      stateChanged = true;
    }
    if (appReset) {
      this.appLimitResetTime = new Date(parseInt(appReset) * 1000);
      stateChanged = true;
    }

    // Check if we're rate limited (either limit hit 0)
    const userAtLimit = userRemaining === '0';
    const appAtLimit = appRemaining === '0';

    if (userAtLimit || appAtLimit) {
      if (!this.isRateLimited) {
        this.isRateLimited = true;
        stateChanged = true;
        const waitUntil = this.getResumeTime();
        const minutesUntil = waitUntil ? Math.round((waitUntil.getTime() - Date.now()) / 60000) : 0;
        
        logger.warn('X API rate limit reached - Pausing all posts', {
          userLimitReset: this.userLimitResetTime?.toISOString(),
          appLimitReset: this.appLimitResetTime?.toISOString(),
          resumeAt: waitUntil?.toISOString(),
          waitMinutes: minutesUntil
        });
      }
    } else {
      // Check if we were rate limited but limits have reset
      if (this.isRateLimited) {
        const now = new Date();
        const userReset = this.userLimitResetTime && now >= this.userLimitResetTime;
        const appReset = this.appLimitResetTime && now >= this.appLimitResetTime;

        if (userReset && appReset) {
          this.isRateLimited = false;
          stateChanged = true;
          logger.info('X API rate limits have reset - Resuming posts', {
            userRemaining,
            appRemaining
          });
        }
      }
    }

    // Save to database if state changed
    if (stateChanged) {
      await this.saveToDatabase();
    }
  }

  /**
   * Get the time when we can safely resume posting (when BOTH limits reset)
   */
  getResumeTime(): Date | null {
    if (!this.userLimitResetTime && !this.appLimitResetTime) {
      return null;
    }

    // Need to wait for BOTH to reset, so use the later time
    if (this.userLimitResetTime && this.appLimitResetTime) {
      return this.userLimitResetTime > this.appLimitResetTime 
        ? this.userLimitResetTime 
        : this.appLimitResetTime;
    }

    // Only one is set, use that
    return this.userLimitResetTime || this.appLimitResetTime;
  }

  /**
   * Check if we can post right now
   */
  canPost(): { allowed: boolean; reason?: string; resumeAt?: Date; waitMinutes?: number } {
    if (!this.isRateLimited) {
      return { allowed: true };
    }

    const resumeTime = this.getResumeTime();
    if (!resumeTime) {
      return { allowed: true }; // No limit info, allow
    }

    const now = new Date();
    if (now >= resumeTime) {
      // Limits should have reset, allow posting
      this.isRateLimited = false;
      logger.info('Rate limit period expired - Resuming posts');
      return { allowed: true };
    }

    // Still rate limited
    const waitMinutes = Math.round((resumeTime.getTime() - now.getTime()) / 60000);
    
    return {
      allowed: false,
      reason: `Rate limited until both user and app limits reset`,
      resumeAt: resumeTime,
      waitMinutes: waitMinutes
    };
  }

  /**
   * Get current status for logging/monitoring
   */
  getStatus(): {
    isRateLimited: boolean;
    userLimitResetTime: string | null;
    appLimitResetTime: string | null;
    resumeTime: string | null;
    minutesUntilResume: number | null;
  } {
    const resumeTime = this.getResumeTime();
    const minutesUntilResume = resumeTime 
      ? Math.round((resumeTime.getTime() - Date.now()) / 60000)
      : null;

    return {
      isRateLimited: this.isRateLimited,
      userLimitResetTime: this.userLimitResetTime?.toISOString() || null,
      appLimitResetTime: this.appLimitResetTime?.toISOString() || null,
      resumeTime: resumeTime?.toISOString() || null,
      minutesUntilResume
    };
  }

  /**
   * Manually mark as rate limited (for 429 responses)
   */
  async markRateLimited(userReset?: number, appReset?: number): Promise<void> {
    if (userReset) {
      this.userLimitResetTime = new Date(userReset * 1000);
    }
    if (appReset) {
      this.appLimitResetTime = new Date(appReset * 1000);
    }
    this.isRateLimited = true;
    await this.saveToDatabase();
  }

  /**
   * Reset tracker (for testing or manual override)
   */
  async reset(): Promise<void> {
    this.isRateLimited = false;
    this.userLimitResetTime = null;
    this.appLimitResetTime = null;
    await this.saveToDatabase();
    logger.info('Rate limit tracker reset');
  }
}

export const rateLimitTracker = new RateLimitTracker();
