import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { TIERS } from '../constants/tiers';

export const getIntelHistory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;
    const walletAddress = req.query.address as string;

    let query = supabaseService.getClient()
      .from('runs')
      .select('*', { count: 'exact' })
      .eq('type', 'intel')
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

    // Apply range last
    query = query.range(offset, offset + limit - 1);

    const { data: runs, error, count } = await query;

    if (error) {
      throw error;
    }

    const intel = runs.map(run => ({
      id: run.id,
      created_at: run.created_at,
      content: run.content,
      public_posted_at: run.public_posted_at
    }));

    res.json({ 
      data: intel,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch intel history:', error);
    res.status(500).json({ error: 'Failed to fetch intel history' });
  }
};
