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
    let requirePublicPosted = false;

    if (walletAddress) {
      const user = await supabaseService.getUser(walletAddress);
      userTier = user?.tier;
      if (user && user.tier) {
        if (user.tier === TIERS.GOLD || user.tier === TIERS.DIAMOND) {
          // Gold/Diamond see everything immediately
          cutoffTime = undefined;
        } else if (user.tier === TIERS.SILVER) {
          // Silver sees after 15 min delay
          cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        } else {
          // Public tier: only show intel that has been posted to X
          requirePublicPosted = true;
        }
      } else {
        // No tier: only show intel that has been posted to X
        requirePublicPosted = true;
      }
    } else {
      // No wallet: only show intel that has been posted to X
      requirePublicPosted = true;
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

    if (requirePublicPosted) {
      // Public users only see intel that has been posted to X
      query = query.not('public_posted_at', 'is', null);
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
    const walletAddress = req.query.address as string;

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

    // Check tier-based access
    let hasAccess = false;
    
    if (walletAddress) {
      const user = await supabaseService.getUser(walletAddress);
      if (user && user.tier) {
        if (user.tier === TIERS.GOLD || user.tier === TIERS.DIAMOND) {
          // Gold/Diamond can see everything
          hasAccess = true;
        } else if (user.tier === TIERS.SILVER) {
          // Silver can see after 15 min delay
          const createdAt = new Date(run.created_at).getTime();
          const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
          hasAccess = createdAt < fifteenMinutesAgo;
        } else {
          // Public: only if posted to X
          hasAccess = run.public_posted_at !== null;
        }
      } else {
        // No tier: only if posted to X
        hasAccess = run.public_posted_at !== null;
      }
    } else {
      // No wallet: only if posted to X
      hasAccess = run.public_posted_at !== null;
    }

    // Deep dives are Gold/Diamond only
    if (run.type === 'deep_dive') {
      if (walletAddress) {
        const user = await supabaseService.getUser(walletAddress);
        if (!user || (user.tier !== TIERS.GOLD && user.tier !== TIERS.DIAMOND)) {
          hasAccess = false;
        }
      } else {
        hasAccess = false;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. Upgrade your tier to view this intel.' });
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
