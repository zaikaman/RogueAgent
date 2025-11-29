import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { TIERS } from '../constants/tiers';

export const scanController = {
  // Async scan - triggers background processing and returns request ID for polling
  async requestScan(req: Request, res: Response) {
    try {
      const { tokenSymbol, walletAddress } = req.body;

      if (!tokenSymbol || !walletAddress) {
        return res.status(400).json({ error: 'tokenSymbol and walletAddress are required' });
      }

      // Validate user exists and is DIAMOND tier
      const user = await supabaseService.getUser(walletAddress);
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found. Please connect your wallet first.',
          tier_required: 'DIAMOND'
        });
      }
      
      if (user.tier !== TIERS.DIAMOND) {
        return res.status(403).json({ 
          success: false,
          error: `Custom scans are exclusive to DIAMOND tier users (1,000+ $RGE). Your current tier: ${user.tier}`,
          tier_required: 'DIAMOND',
          current_tier: user.tier
        });
      }
      
      // Create custom request
      logger.info('Creating custom scan request', { walletAddress, tokenSymbol });
      const request = await supabaseService.createCustomRequest({
        user_wallet_address: walletAddress,
        token_symbol: tokenSymbol.toUpperCase(),
        status: 'pending',
      });
      
      // Trigger orchestrator (async)
      const { orchestrator } = await import('../agents/orchestrator');
      orchestrator.processCustomRequest(request.id, tokenSymbol.toUpperCase(), walletAddress)
        .catch((err: any) => logger.error('Error processing custom request:', err));
      
      res.json({
        success: true,
        message: `Scan initiated for ${tokenSymbol.toUpperCase()}. You will receive the analysis shortly.`,
        request_id: request.id,
      });
      
    } catch (error: any) {
      logger.error('Error in Scan Controller', error);
      res.status(500).json({ error: 'Failed to process scan request' });
    }
  },

  // Get scan status - for frontend polling
  async getScanStatus(req: Request, res: Response) {
    try {
      const { requestId } = req.params;

      if (!requestId) {
        return res.status(400).json({ error: 'requestId is required' });
      }

      const request = await supabaseService.getCustomRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ 
          success: false,
          error: 'Request not found'
        });
      }

      // Return status and result if completed
      if (request.status === 'completed') {
        const content = request.analysis_result?.formatted_content || 
                        request.analysis_result?.blog_post || 
                        'Analysis completed.';
        res.json({
          success: true,
          status: 'completed',
          message: content,
          token: request.token_symbol
        });
      } else if (request.status === 'failed') {
        res.json({
          success: false,
          status: 'failed',
          error: request.error_message || 'Scan failed. Please try again.',
          token: request.token_symbol
        });
      } else {
        // Still processing
        res.json({
          success: true,
          status: request.status,
          token: request.token_symbol
        });
      }

    } catch (error: any) {
      logger.error('Error in getScanStatus', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get scan status'
      });
    }
  }
};
