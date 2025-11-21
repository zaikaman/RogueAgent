import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

export const getIntelHistory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: runs, error } = await supabaseService.getClient()
      .from('runs')
      .select('*')
      .eq('type', 'intel')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const intel = runs.map(run => ({
      id: run.id,
      created_at: run.created_at,
      content: run.content,
      public_posted_at: run.public_posted_at
    }));

    res.json({ data: intel });
  } catch (error) {
    logger.error('Failed to fetch intel history:', error);
    res.status(500).json({ error: 'Failed to fetch intel history' });
  }
};
