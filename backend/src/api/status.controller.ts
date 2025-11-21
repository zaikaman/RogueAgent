import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { config } from '../config/env.config';
import { TIERS } from '../constants/tiers';

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

    const [latestRun, latestSignal, latestIntel] = await Promise.all([
      supabaseService.getLatestRun(cutoffTime),
      supabaseService.getLatestSignal(cutoffTime),
      supabaseService.getLatestIntel(cutoffTime)
    ]);
    
    if (!latestRun) {
      return res.json({
        status: 'idle',
        last_run: null,
        latest_signal: null,
        latest_intel: null,
        next_run_in: 0,
        interval_minutes: config.RUN_INTERVAL_MINUTES
      });
    }

    // Calculate time until next run
    const intervalMs = config.RUN_INTERVAL_MINUTES * 60 * 1000;
    const lastRunTime = new Date(latestRun.created_at).getTime();
    const nextRunTime = lastRunTime + intervalMs;
    const now = Date.now();
    const timeUntilNextRun = Math.max(0, nextRunTime - now);

    res.json({
      status: timeUntilNextRun > 0 ? 'idle' : 'due',
      last_run: latestRun,
      latest_signal: latestSignal,
      latest_intel: latestIntel,
      next_run_in: timeUntilNextRun,
      interval_minutes: config.RUN_INTERVAL_MINUTES
    });
  } catch (error) {
    logger.error('Failed to get status:', error);
    res.status(500).json({ error: 'Failed to retrieve status' });
  }
};
