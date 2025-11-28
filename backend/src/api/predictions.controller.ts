import { Request, Response, Router } from 'express';
import { predictionMarketsService } from '../services/prediction-markets.service';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

const router = Router();

/**
 * GET /api/predictions
 * Get high-edge prediction markets
 * Diamond tier: All markets (8-15)
 * Public: Only 1 featured market for demo
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.wallet as string | undefined;
    const limit = parseInt(req.query.limit as string) || 15;
    
    // Check user tier if wallet provided
    let isDiamond = false;
    if (walletAddress) {
      const user = await supabaseService.getUser(walletAddress);
      isDiamond = user?.tier === 'DIAMOND';
    }

    if (isDiamond) {
      // Diamond users get all high-edge markets
      const markets = await predictionMarketsService.getHighEdgeMarkets(limit);
      const status = predictionMarketsService.getStatus();
      
      res.json({
        markets,
        total: markets.length,
        tier: 'DIAMOND',
        scan_status: status,
      });
    } else {
      // Public users get only 1 featured market for demo
      const featuredMarket = await predictionMarketsService.getFeaturedMarket();
      const status = predictionMarketsService.getStatus();
      
      res.json({
        markets: featuredMarket ? [featuredMarket] : [],
        total: featuredMarket ? 1 : 0,
        tier: 'PUBLIC',
        scan_status: status,
        message: 'Hold 1000+ $RGE to unlock all high-edge markets',
      });
    }
  } catch (error) {
    logger.error('Error in Predictions Controller - GET /', error);
    res.status(500).json({ error: 'Failed to fetch prediction markets' });
  }
});

/**
 * GET /api/predictions/status
 * Get scan status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = predictionMarketsService.getStatus();
    const hasMarkets = await predictionMarketsService.hasMarkets();
    
    res.json({
      ...status,
      hasMarkets,
    });
  } catch (error) {
    logger.error('Error in Predictions Controller - GET /status', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * POST /api/predictions/scan
 * Trigger a manual scan (admin/internal use)
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.body.wallet as string | undefined;
    
    // Only Diamond users can trigger manual scans
    if (walletAddress) {
      const user = await supabaseService.getUser(walletAddress);
      if (user?.tier !== 'DIAMOND') {
        return res.status(403).json({ error: 'Diamond tier required to trigger manual scan' });
      }
    }

    // Check if scan is already running
    const status = predictionMarketsService.getStatus();
    if (status.isScanning) {
      return res.status(409).json({ 
        error: 'Scan already in progress',
        status 
      });
    }

    // Run scan in background
    predictionMarketsService.runScan().catch((err: Error) => {
      logger.error('Background scan failed:', err);
    });

    res.json({ 
      message: 'Scan started',
      status: predictionMarketsService.getStatus(),
    });
  } catch (error) {
    logger.error('Error in Predictions Controller - POST /scan', error);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

export const predictionsController = router;
