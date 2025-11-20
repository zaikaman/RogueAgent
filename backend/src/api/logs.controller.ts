import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

export const getLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data, count } = await supabaseService.getLogs(limit, offset);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
};
