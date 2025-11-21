import { Router, Request, Response } from 'express';
import { SupabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { z } from 'zod';
import { TIERS } from '../constants/tiers';
import { orchestrator } from '../agents/orchestrator';

const router = Router();
const supabaseService = new SupabaseService();

const requestSchema = z.object({
  walletAddress: z.string().min(1),
  tokenSymbol: z.string().min(1),
  tokenContract: z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenSymbol, tokenContract } = requestSchema.parse(req.body);

    // 1. Verify User Tier
    const user = await supabaseService.getUser(walletAddress);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.tier !== TIERS.DIAMOND) {
      res.status(403).json({ success: false, error: 'Only Diamond tier users can make custom requests' });
      return;
    }

    // 2. Check Quota (Unlimited for Diamond)
    // const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // const count = await supabaseService.getCustomRequestsCount(walletAddress, yesterday);

    // if (count >= 1) {
    //   res.status(429).json({ success: false, error: 'Daily quota exceeded (1 request per 24h)' });
    //   return;
    // }

    // 3. Create Request
    const request = await supabaseService.createCustomRequest({
      user_wallet_address: walletAddress,
      token_symbol: tokenSymbol,
      token_contract: tokenContract,
      status: 'pending',
    });

    // 4. Trigger Processing (Async)
    logger.info(`Custom request created for ${walletAddress}: ${tokenSymbol}`);
    
    // Fire and forget
    orchestrator.processCustomRequest(request.id, tokenSymbol, walletAddress);

    res.json({ success: true, data: request });

  } catch (error) {
    logger.error('Error in custom request endpoint', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
});

export const customRequestsController = router;
