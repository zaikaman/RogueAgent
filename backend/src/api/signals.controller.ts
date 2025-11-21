import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { SignalContent } from '../../shared/types/signal.types';

export const getSignalHistory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: runs, error } = await supabaseService.getClient()
      .from('runs')
      .select('*')
      .eq('type', 'signal')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

    res.json({ data: signals });
  } catch (error) {
    logger.error('Failed to fetch signal history:', error);
    res.status(500).json({ error: 'Failed to fetch signal history' });
  }
};
