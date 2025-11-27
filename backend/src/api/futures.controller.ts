import { Router, Request, Response } from 'express';
import { futuresAgentsService } from '../services/futures-agents.service';
import { signalExecutorService } from '../services/signal-executor.service';
import { signalJobsService } from '../services/signal-jobs.service';
import { tierManager } from '../agents/tier-manager.agent';
import { logger } from '../utils/logger.util';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// FUTURES AGENTS CONTROLLER
// Diamond-only endpoints for Hyperliquid Perpetual Futures trading agents (Testnet)
// ═══════════════════════════════════════════════════════════════════════════════

const router = Router();

// Validation schemas
const walletSchema = z.object({
  walletAddress: z.string().min(1),
});

const apiKeysSchema = z.object({
  walletAddress: z.string().min(1), // Connected wallet (for DB lookup)
  hyperliquidWalletAddress: z.string().min(1), // Hyperliquid wallet address
  privateKey: z.string().min(1), // Hyperliquid private key
  networkMode: z.enum(['mainnet', 'testnet']).optional().default('testnet'), // Network mode
});

const createAgentSchema = z.object({
  walletAddress: z.string().min(1),
  name: z.string().min(1).max(50),
  type: z.enum(['classic', 'custom']),
  riskPerTrade: z.number().min(0.5).max(5).optional(),
  maxConcurrentPositions: z.number().int().min(1).max(10).optional(),
  maxLeverage: z.number().int().min(1).max(50).optional(),
  customPrompt: z.string().max(2000).optional(),
});

const updateAgentSchema = z.object({
  walletAddress: z.string().min(1),
  agentId: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  riskPerTrade: z.number().min(0.5).max(5).optional(),
  maxConcurrentPositions: z.number().int().min(1).max(10).optional(),
  maxLeverage: z.number().int().min(1).max(50).optional(),
  customPrompt: z.string().max(2000).optional(),
});

const signalWebhookSchema = z.object({
  signalId: z.string().uuid(),
  signal: z.object({
    token: z.object({
      symbol: z.string(),
      name: z.string(),
      contract_address: z.string(),
    }),
    entry_price: z.number(),
    target_price: z.number(),
    stop_loss: z.number(),
    confidence: z.number(),
    trigger_event: z.object({
      type: z.string(),
      kol_handle: z.string().optional(),
      tweet_url: z.string().optional(),
      description: z.string().optional(),
    }),
    analysis: z.string(),
    formatted_tweet: z.string(),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Diamond tier verification
// ═══════════════════════════════════════════════════════════════════════════

async function requireDiamondTier(req: Request, res: Response, next: Function) {
  const walletAddress = req.body.walletAddress || req.query.walletAddress;
  
  if (!walletAddress) {
    return res.status(400).json({ success: false, error: 'Wallet address required' });
  }

  try {
    const { tier } = await tierManager.verifyTier(walletAddress);
    
    if (tier !== 'DIAMOND') {
      return res.status(403).json({ 
        success: false, 
        error: 'Diamond tier required (1,000+ $RGE)',
        currentTier: tier,
      });
    }
    
    next();
  } catch (error) {
    logger.error('Tier verification error', error);
    return res.status(500).json({ success: false, error: 'Tier verification failed' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /futures/api-keys
 * Save Hyperliquid wallet credentials (encrypted)
 */
router.post('/api-keys', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress, hyperliquidWalletAddress, privateKey, networkMode } = apiKeysSchema.parse(req.body);
    
    const result = await futuresAgentsService.saveApiKeys(walletAddress, hyperliquidWalletAddress, privateKey, networkMode);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, message: 'API keys saved successfully', networkMode });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error saving API keys', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /futures/api-keys/test
 * Test Hyperliquid connection
 */
router.post('/api-keys/test', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    
    const result = await futuresAgentsService.testApiKeys(walletAddress);
    
    res.json({ 
      success: result.success, 
      balance: result.balance,
      error: result.error,
      networkMode: result.networkMode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error testing API keys', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /futures/api-keys
 * Delete Hyperliquid credentials
 */
router.delete('/api-keys', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    
    const deleted = await futuresAgentsService.deleteApiKeys(walletAddress);
    
    res.json({ success: deleted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error deleting API keys', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /futures/api-keys/status
 * Check if user has API keys configured
 */
router.get('/api-keys/status', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    const keys = await futuresAgentsService.getApiKeys(walletAddress);
    const hasKeys = !!keys;
    
    let balance: number | undefined;
    let networkMode: 'mainnet' | 'testnet' | undefined;
    if (hasKeys) {
      const testResult = await futuresAgentsService.testApiKeys(walletAddress);
      balance = testResult.balance;
      networkMode = keys.networkMode;
    }

    res.json({ 
      success: true, 
      hasApiKeys: hasKeys,
      balance,
      networkMode,
    });
  } catch (error) {
    logger.error('Error checking API keys status', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /futures/agents
 * Get all agents for a user
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    const agents = await futuresAgentsService.getUserAgents(walletAddress);
    
    res.json({ success: true, data: agents });
  } catch (error) {
    logger.error('Error fetching agents', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /futures/agents
 * Create a new agent
 */
router.post('/agents', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const data = createAgentSchema.parse(req.body);
    
    const agent = await futuresAgentsService.createAgent({
      walletAddress: data.walletAddress,
      name: data.name,
      type: data.type,
      riskPerTrade: data.riskPerTrade,
      maxConcurrentPositions: data.maxConcurrentPositions,
      maxLeverage: data.maxLeverage,
      customPrompt: data.customPrompt,
    });

    if (!agent) {
      return res.status(400).json({ 
        success: false, 
        error: data.type === 'classic' 
          ? 'You already have a Classic Rogue Agent' 
          : 'Failed to create agent',
      });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error creating agent', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /futures/agents
 * Update an agent
 */
router.put('/agents', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const data = updateAgentSchema.parse(req.body);
    
    const agent = await futuresAgentsService.updateAgent(
      data.agentId,
      data.walletAddress,
      {
        name: data.name,
        is_active: data.isActive,
        risk_per_trade: data.riskPerTrade,
        max_concurrent_positions: data.maxConcurrentPositions,
        max_leverage: data.maxLeverage,
        custom_prompt: data.customPrompt,
      }
    );

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error updating agent', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /futures/agents/:agentId
 * Delete an agent
 */
router.delete('/agents/:agentId', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    const { agentId } = req.params;
    
    const deleted = await futuresAgentsService.deleteAgent(agentId, walletAddress);
    
    if (!deleted) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete agent with open positions',
      });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error deleting agent', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /futures/agents/:agentId/duplicate
 * Duplicate an agent
 */
router.post('/agents/:agentId/duplicate', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    const { agentId } = req.params;
    
    const agent = await futuresAgentsService.duplicateAgent(agentId, walletAddress);
    
    if (!agent) {
      return res.status(400).json({ success: false, error: 'Cannot duplicate classic agents' });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error duplicating agent', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POSITIONS & TRADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /futures/positions
 * Get all open positions for a user
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    // Sync positions first
    await futuresAgentsService.syncPositions(walletAddress);
    
    const positions = await futuresAgentsService.getUserPositions(walletAddress);
    
    res.json({ success: true, data: positions });
  } catch (error) {
    logger.error('Error fetching positions', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /futures/trades
 * Get trade history for a user
 */
router.get('/trades', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    // Update trade statuses first (syncs PnL for any closed trades)
    await signalExecutorService.updateTradeStatuses(walletAddress).catch(err => 
      logger.warn('Failed to update trade statuses:', err.message)
    );

    const trades = await futuresAgentsService.getUserTrades(walletAddress, limit);
    
    res.json({ success: true, data: trades });
  } catch (error) {
    logger.error('Error fetching trades', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /futures/positions/:symbol/close
 * Close a specific position
 */
router.post('/positions/:symbol/close', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    const { symbol } = req.params;
    
    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    if (!hyperliquid) {
      return res.status(400).json({ success: false, error: 'No Hyperliquid service available' });
    }

    const result = await hyperliquid.closePosition(symbol);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'No position found' });
    }

    // Sync positions after close
    await futuresAgentsService.syncPositions(walletAddress);
    
    // Update trade statuses (calculates and saves PnL)
    await signalExecutorService.updateTradeStatuses(walletAddress);

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error closing position', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * POST /futures/orders/:tradeId/cancel
 * Cancel a pending limit order
 */
router.post('/orders/:tradeId/cancel', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    const { tradeId } = req.params;
    
    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    if (!hyperliquid) {
      return res.status(400).json({ success: false, error: 'No Hyperliquid service available' });
    }

    // Get the trade to find the entry order ID and symbol
    const trades = await futuresAgentsService.getUserTrades(walletAddress, 100);
    const trade = trades.find(t => t.id === tradeId);
    
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }
    
    if (trade.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Trade is not in pending status' });
    }

    // Cancel the entry order on Hyperliquid
    const entryOrderId = parseInt(trade.entry_order_id);
    if (entryOrderId > 0) {
      await hyperliquid.cancelOrder(trade.symbol, entryOrderId);
    }

    // Update trade status to 'closed' (cancelled)
    await futuresAgentsService.updateTrade(tradeId, {
      status: 'closed',
      error_message: 'Limit order cancelled by user',
      pending_tp_price: null,
      pending_sl_price: null,
      closed_at: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error cancelling order', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /futures/emergency/close-all
 * Emergency close all positions
 */
router.post('/emergency/close-all', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    
    // Deactivate all agents first
    await futuresAgentsService.deactivateAllAgents(walletAddress);
    
    // Close all positions
    const result = await futuresAgentsService.emergencyCloseAll(walletAddress);
    
    // Update trade statuses (calculates and saves PnL for closed trades)
    await signalExecutorService.updateTradeStatuses(walletAddress);
    
    res.json({ 
      success: result.closed.length > 0 || result.errors.length === 0,
      closed: result.closed,
      errors: result.errors,
    });
  } catch (error: any) {
    logger.error('Error in emergency close', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * POST /futures/emergency/deactivate-all
 * Deactivate all agents
 */
router.post('/emergency/deactivate-all', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    
    const count = await futuresAgentsService.deactivateAllAgents(walletAddress);
    
    res.json({ success: true, deactivatedCount: count });
  } catch (error) {
    logger.error('Error deactivating agents', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /futures/trades/recalculate-pnl
 * Recalculate PnL for closed trades that have 0 PnL (repair function)
 */
router.post('/trades/recalculate-pnl', requireDiamondTier, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = walletSchema.parse(req.body);
    
    const result = await signalExecutorService.recalculateClosedTradePnL(walletAddress);
    
    res.json({ 
      success: true, 
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error: any) {
    logger.error('Error recalculating PnL', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL WEBHOOK (For signal processing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /futures/webhook/signal
 * Internal webhook to process new signals (called by run system)
 */
router.post('/webhook/signal', async (req: Request, res: Response) => {
  try {
    // Validate webhook secret (for internal use only)
    const webhookSecret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.FUTURES_WEBHOOK_SECRET;
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
    }

    const data = signalWebhookSchema.parse(req.body);
    
    const result = await signalExecutorService.processSignal({
      signalId: data.signalId,
      signal: data.signal as any,
    });
    
    res.json({ 
      success: true, 
      processed: result.processed,
      executed: result.executed,
      results: result.results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error processing signal webhook', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT INFO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /futures/account
 * Get Hyperliquid Futures account info
 */
router.get('/account', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    if (!hyperliquid) {
      return res.status(400).json({ success: false, error: 'No Hyperliquid service available' });
    }

    const userState = await hyperliquid.getUserState();
    const equity = parseFloat(userState.marginSummary.accountValue);
    const balance = parseFloat(userState.withdrawable);
    
    // Calculate unrealized PnL by summing up all position unrealized PnLs
    const unrealizedPnl = userState.assetPositions
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .reduce((sum, ap) => sum + parseFloat(ap.position.unrealizedPnl), 0);

    res.json({ 
      success: true, 
      data: {
        balance,
        equity,
        unrealizedPnl,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching account info', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL JOBS (Background processing status for custom agents)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /futures/jobs
 * Get active and recent signal jobs for a user
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.walletAddress as string;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    const [activeJobs, recentJobs] = await Promise.all([
      signalJobsService.getActiveJobsForUser(walletAddress),
      signalJobsService.getRecentJobsForUser(walletAddress, 20),
    ]);

    res.json({ 
      success: true, 
      data: {
        active: activeJobs,
        recent: recentJobs.filter(j => !activeJobs.find(a => a.id === j.id)), // Exclude active from recent
      },
    });
  } catch (error: any) {
    logger.error('Error fetching signal jobs', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * GET /futures/jobs/:jobId
 * Get a specific signal job status
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await signalJobsService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error: any) {
    logger.error('Error fetching signal job', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * GET /futures/jobs/stats
 * Get job processing statistics (for monitoring)
 */
router.get('/jobs/stats', async (req: Request, res: Response) => {
  try {
    const stats = await signalJobsService.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error('Error fetching job stats', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export const futuresController = router;
