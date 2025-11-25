import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { SignalContent } from '../../shared/types/signal.types';
import { TIERS } from '../constants/tiers';
import { signalMonitorService } from '../services/signal-monitor.service';

export const getSignalHistory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;
    const walletAddress = req.query.address as string;

    let query = supabaseService.getClient()
      .from('runs')
      .select('*', { count: 'exact' })
      .eq('type', 'signal')
      .order('created_at', { ascending: false });

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

    if (cutoffTime) {
      query = query.lt('created_at', cutoffTime);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: runs, error, count } = await query;

    if (error) {
      throw error;
    }

    // We could enrich this with current prices here if we wanted to be fancy,
    // but for now let's just return the stored data.
    // The SignalMonitorService updates the status in the background, so the 'status' field
    // in the content JSON should be relatively up to date.

    const signals = runs.map(run => ({
      id: run.id,
      created_at: run.created_at,
      content: run.content as SignalContent,
      public_posted_at: run.public_posted_at
    }));

    res.json({ 
      data: signals,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch signal history:', error);
    res.status(500).json({ error: 'Failed to fetch signal history' });
  }
};

export const recalculateHistoricalPnL = async (req: Request, res: Response) => {
  try {
    logger.info('Triggering historical PnL recalculation...');
    await signalMonitorService.recalculateHistoricalPnL();
    res.json({ success: true, message: 'Historical PnL recalculated with 1% risk model' });
  } catch (error) {
    logger.error('Failed to recalculate historical PnL:', error);
    res.status(500).json({ error: 'Failed to recalculate historical PnL' });
  }
};
