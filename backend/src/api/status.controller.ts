import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { config } from '../config/env.config';
import { TIERS } from '../constants/tiers';

// X API daily post limit
const X_DAILY_POST_LIMIT = 17;

export const getLatestStatus = async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.address as string;
    let cutoffTime: string | undefined;

    if (walletAddress) {
      const user = await supabaseService.getUser(walletAddress);
      if (user && user.tier) {
        if (user.tier === TIERS.GOLD || user.tier === TIERS.DIAMOND) {
          cutoffTime = undefined;
        } else if (user.tier === TIERS.SILVER) {
          cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        } else {
          cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        }
      } else {
        cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      }
    } else {
      cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    }

    const [latestRun, latestSignal, latestIntel, realLatestRun] = await Promise.all([
      supabaseService.getLatestRun(cutoffTime),
      supabaseService.getLatestSignal(cutoffTime),
      supabaseService.getLatestIntel(cutoffTime),
      supabaseService.getLatestRun()
    ]);
    
    if (!latestRun && !realLatestRun) {
      return res.json({
        status: 'idle',
        last_run: null,
        latest_signal: null,
        latest_intel: null,
        next_run_in: 0,
        interval_minutes: config.RUN_INTERVAL_MINUTES
      });
    }

    // Calculate time until next run based on REAL latest run
    const intervalMs = config.RUN_INTERVAL_MINUTES * 60 * 1000;
    const lastRunTime = realLatestRun ? new Date(realLatestRun.created_at).getTime() : 0;
    const nextRunTime = lastRunTime + intervalMs;
    const now = Date.now();
    const timeUntilNextRun = Math.max(0, nextRunTime - now);

    // Get X API rate limit status
    let xRateLimit;
    try {
      const rateLimitStatus = await supabaseService.getXRateLimitStatus();
      xRateLimit = {
        is_limited: rateLimitStatus.isLimited,
        posts_remaining: rateLimitStatus.postsRemaining,
        posts_used: rateLimitStatus.currentCount,
        max_posts_per_day: X_DAILY_POST_LIMIT,
        reset_time: rateLimitStatus.resetTime?.toISOString() || null
      };
    } catch (e) {
      xRateLimit = null;
    }

    res.json({
      status: timeUntilNextRun > 0 ? 'idle' : 'due',
      last_run: latestRun,
      system_last_run_at: realLatestRun?.created_at,
      latest_signal: latestSignal,
      latest_intel: latestIntel,
      next_run_in: timeUntilNextRun,
      interval_minutes: config.RUN_INTERVAL_MINUTES,
      x_rate_limit: xRateLimit
    });
  } catch (error) {
    logger.error('Failed to get status:', error);
    res.status(500).json({ error: 'Failed to retrieve status' });
  }
};

/**
 * Get X API rate limit status
 * Returns information about daily post limits and reset time
 */
export const getXRateLimitStatus = async (req: Request, res: Response) => {
  try {
    const rateLimitStatus = await supabaseService.getXRateLimitStatus();
    
    const timeUntilReset = rateLimitStatus.resetTime 
      ? Math.max(0, Math.ceil((rateLimitStatus.resetTime.getTime() - Date.now()) / 1000 / 60))
      : null;

    res.json({
      is_limited: rateLimitStatus.isLimited,
      posts_used: rateLimitStatus.currentCount,
      posts_remaining: rateLimitStatus.postsRemaining,
      max_posts_per_day: X_DAILY_POST_LIMIT,
      reset_time: rateLimitStatus.resetTime?.toISOString() || null,
      minutes_until_reset: timeUntilReset,
      message: rateLimitStatus.isLimited 
        ? `X API rate limit reached. Swarm runs paused until ${rateLimitStatus.resetTime?.toISOString() || 'reset'}.`
        : `${rateLimitStatus.postsRemaining} X posts remaining today.`
    });
  } catch (error) {
    logger.error('Failed to get X rate limit status:', error);
    res.status(500).json({ error: 'Failed to retrieve rate limit status' });
  }
};
