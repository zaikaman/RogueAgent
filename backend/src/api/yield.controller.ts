import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

export const yieldController = {
  async getOpportunities(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await supabaseService.getLatestYieldOpportunities(page, limit);
      res.json(result);
    } catch (error) {
      logger.error('Error in Yield Controller', error);
      res.status(500).json({ error: 'Failed to fetch yield opportunities' });
    }
  }
};
