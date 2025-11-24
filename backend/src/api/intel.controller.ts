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

    let userTier: string | undefined;
    let cutoffTime: string | undefined;

    if (walletAddress) {
      const user = await supabaseService.getUser(walletAddress);
      userTier = user?.tier;
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

    // Gold/Diamond users see both 'intel' and 'deep_dive' types
    // Other users only see 'intel'
    const allowedTypes = (userTier === TIERS.GOLD || userTier === TIERS.DIAMOND) 
      ? ['intel', 'deep_dive']
      : ['intel'];

    let query = supabaseService.getClient()
      .from('runs')
      .select('*', { count: 'exact' })
      .in('type', allowedTypes)
      .order('created_at', { ascending: false });

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
      type: run.type,
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

export const getIntelById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: run, error } = await supabaseService.getClient()
      .from('runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!run) {
      return res.status(404).json({ error: 'Intel not found' });
    }

    // Allow if type is intel or deep_dive
    if (run.type !== 'intel' && run.type !== 'deep_dive') {
         return res.status(404).json({ error: 'Intel not found' });
    }

    const intel = {
      id: run.id,
      type: run.type,
      created_at: run.created_at,
      content: run.content,
      public_posted_at: run.public_posted_at
    };

    res.json(intel);
  } catch (error) {
    logger.error('Failed to fetch intel detail:', error);
    res.status(500).json({ error: 'Failed to fetch intel detail' });
  }
};
