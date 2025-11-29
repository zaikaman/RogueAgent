import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { TIERS } from '../constants/tiers';

export const getLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const walletAddress = req.query.address as string;

    let cutoffTime: string | undefined;

    // Check tier if address is provided (respects temporary diamond access)
    if (walletAddress) {
      const effectiveTier = await supabaseService.getEffectiveTier(walletAddress);
      
      if (effectiveTier) {
        if (effectiveTier === TIERS.GOLD || effectiveTier === TIERS.DIAMOND) {
          cutoffTime = undefined;
        } else if (effectiveTier === TIERS.SILVER) {
          cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        } else {
          cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        }
      } else {
        cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      }
    } else {
      // Default delay for public users
      cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    }

    const { data, count } = await supabaseService.getLogs(limit, offset, cutoffTime);

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
