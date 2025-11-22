import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { supabaseService, DbIqAiLog } from './supabase.service';

export class IqAiService {
  private readonly baseUrl = 'https://app.iqai.com/api';
  private isProcessing = false;

  async postLog(content: string, type: 'Agent' | 'Developer' = 'Agent', txHash?: string, chainId?: string) {
    if (!config.IQAI_API_KEY || !config.AGENT_TOKEN_CONTRACT) {
      logger.warn('IQAI_API_KEY or AGENT_TOKEN_CONTRACT not configured. Skipping log post.');
      return;
    }

    try {
      // Save to DB first
      await supabaseService.createIqAiLog({
        content,
        type,
        tx_hash: txHash,
        chain_id: chainId,
        status: 'pending'
      });

      // Trigger processing immediately (fire and forget)
      this.processPendingLogs();
    } catch (error) {
      logger.error('Error saving IQ AI log to database:', error);
    }
  }

  async processPendingLogs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const logs = await supabaseService.getPendingIqAiLogs();
      if (!logs || logs.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const log of logs) {
        await this.sendLog(log);
      }
    } catch (error) {
      logger.error('Error processing pending IQ AI logs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendLog(log: DbIqAiLog) {
    if (!log.id) return;

    try {
      // Mark as processing
      await supabaseService.updateIqAiLog(log.id, { status: 'processing' });

      const payload: any = {
        agentTokenContract: config.AGENT_TOKEN_CONTRACT,
        content: log.content,
        type: log.type
      };

      // Only include txHash and chainId if they exist
      if (log.tx_hash) payload.txHash = log.tx_hash;
      if (log.chain_id) payload.chainId = log.chain_id;

      const response = await fetch(`${this.baseUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': config.IQAI_API_KEY!
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `Failed to post log to IQ AI: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`;
        logger.error(errorMessage);
        
        await supabaseService.updateIqAiLog(log.id, { 
          status: 'failed', 
          error_message: errorMessage,
          retry_count: (log.retry_count || 0) + 1
        });
        return;
      }

      const data = await response.json();
      logger.info('Successfully posted log to IQ AI', data);
      
      await supabaseService.updateIqAiLog(log.id, { 
        status: 'completed',
        error_message: null
      });
      
    } catch (error: any) {
      logger.error('Error sending log to IQ AI:', error);
      await supabaseService.updateIqAiLog(log.id, { 
        status: 'failed', 
        error_message: error.message || 'Unknown error',
        retry_count: (log.retry_count || 0) + 1
      });
    }
  }

  startLogProcessor(intervalMs: number = 60000) {
    // Run immediately on startup
    this.processPendingLogs();
    
    // Run periodically
    setInterval(() => {
      this.processPendingLogs();
    }, intervalMs);
  }
}

export const iqAiService = new IqAiService();
