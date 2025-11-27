import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { config } from '../config/env.config';
import { TIERS } from '../constants/tiers';

// Minimum interval between X posts (90 minutes = max 16 posts/day)
const MIN_POST_INTERVAL_MINUTES = 90;

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

    // Get X API rate limit status (90-min spacing)
    let xRateLimit;
    try {
      const rateLimitStatus = await supabaseService.getXRateLimitStatus();
      xRateLimit = {
        is_limited: rateLimitStatus.isLimited,
        minutes_until_next_post: rateLimitStatus.minutesUntilNextPost,
        min_interval_minutes: MIN_POST_INTERVAL_MINUTES,
        last_post_time: rateLimitStatus.lastPostTime?.toISOString() || null
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
 * Returns information about post spacing (90-min minimum between posts)
 */
export const getXRateLimitStatus = async (req: Request, res: Response) => {
  try {
    const rateLimitStatus = await supabaseService.getXRateLimitStatus();

    res.json({
      is_limited: rateLimitStatus.isLimited,
      minutes_until_next_post: rateLimitStatus.minutesUntilNextPost,
      min_interval_minutes: MIN_POST_INTERVAL_MINUTES,
      last_post_time: rateLimitStatus.lastPostTime?.toISOString() || null,
      message: rateLimitStatus.isLimited 
        ? `X post cooldown active. Next post available in ${rateLimitStatus.minutesUntilNextPost} minutes.`
        : 'Ready to post to X.'
    });
  } catch (error) {
    logger.error('Failed to get X rate limit status:', error);
    res.status(500).json({ error: 'Failed to retrieve rate limit status' });
  }
};
