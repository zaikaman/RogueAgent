import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

export const getLatestStatus = async (req: Request, res: Response) => {
  try {
    const latestRun = await supabaseService.getLatestRun();
    
    if (!latestRun) {
      return res.json({
        status: 'idle',
        last_run: null,
        next_run_in: 0, // Should calculate based on schedule
      });
    }

    // Calculate time until next run (assuming 20 min cycle)
    const lastRunTime = new Date(latestRun.created_at).getTime();
    const nextRunTime = lastRunTime + 20 * 60 * 1000;
    const now = Date.now();
    const timeUntilNextRun = Math.max(0, nextRunTime - now);

    res.json({
      status: timeUntilNextRun > 0 ? 'idle' : 'due',
      last_run: latestRun,
      next_run_in: timeUntilNextRun,
    });
  } catch (error) {
    logger.error('Failed to get status:', error);
    res.status(500).json({ error: 'Failed to retrieve status' });
  }
};
