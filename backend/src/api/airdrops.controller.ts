import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

export const getAirdrops = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { airdrops, total } = await supabaseService.getAirdrops(page, limit);
    
    res.json({
      airdrops,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil((total || 0) / limit)
      }
    });
  } catch (error: any) {
    logger.error('Failed to fetch airdrops', error);
    res.status(500).json({ error: error.message });
  }
};
