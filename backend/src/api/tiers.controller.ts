import { Router, Request, Response } from 'express';
import { tierManager } from '../agents/tier-manager.agent';
import { SupabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { z } from 'zod';

const router = Router();
const supabaseService = new SupabaseService();

const verifySchema = z.object({
  walletAddress: z.string().min(1),
  // signature: z.string().optional(), // For future use
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = verifySchema.parse(req.body);

    logger.info(`Verifying tier for ${walletAddress}`);

    const { tier, balance, usdValue } = await tierManager.verifyTier(walletAddress);

    // Save to Supabase
    const user = await supabaseService.upsertUser({
      wallet_address: walletAddress,
      tier,
      rge_balance_usd: usdValue,
      last_verified_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        tier,
        balance,
        usdValue,
        user,
      },
    });
  } catch (error) {
    logger.error('Error in /verify endpoint', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
});

export const tiersController = router;
