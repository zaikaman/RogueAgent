import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

export const yieldController = {
  async getOpportunities(req: Request, res: Response) {
    try {
      const opportunities = await supabaseService.getLatestYieldOpportunities();
      res.json({ opportunities });
    } catch (error) {
      logger.error('Error in Yield Controller', error);
      res.status(500).json({ error: 'Failed to fetch yield opportunities' });
    }
  }
};
