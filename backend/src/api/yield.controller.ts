import { Request, Response, Router } from 'express';
import { supabaseService } from '../services/supabase.service';
import { yieldMarketsService } from '../services/yield-markets.service';
import { logger } from '../utils/logger.util';

const router = Router();

/**
 * GET /api/yield
 * Get yield farming opportunities
 * Auto-triggers scan if no data exists
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await supabaseService.getLatestYieldOpportunities(page, limit);
    const status = yieldMarketsService.getStatus();
    
    // Auto-trigger scan if no opportunities exist and not already scanning
    if ((!result.opportunities || result.opportunities.length === 0) && !status.isScanning) {
      logger.info('[YieldController] No opportunities found, auto-triggering scan...');
      yieldMarketsService.runScan().catch((err: Error) => {
        logger.error('Background yield scan failed:', err);
      });
    }
    
    res.json({
      ...result,
      scan_status: yieldMarketsService.getStatus(),
    });
  } catch (error) {
    logger.error('Error in Yield Controller - GET /', error);
    res.status(500).json({ error: 'Failed to fetch yield opportunities' });
  }
});

/**
 * GET /api/yield/status
 * Get scan status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = yieldMarketsService.getStatus();
    const hasOpportunities = await yieldMarketsService.hasOpportunities();
    
    res.json({
      ...status,
      hasOpportunities,
    });
  } catch (error) {
    logger.error('Error in Yield Controller - GET /status', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export const yieldController = router;
