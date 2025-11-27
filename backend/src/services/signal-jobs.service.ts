import { supabaseService } from './supabase.service';
import { logger } from '../utils/logger.util';
import { SignalContent } from '../../shared/types/signal.types';

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL JOBS SERVICE
// Manages background job queue for async signal processing
// Prevents Heroku timeouts by processing LLM evaluations asynchronously
// ═══════════════════════════════════════════════════════════════════════════════

export type SignalJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface SignalJob {
  id: string;
  user_wallet_address: string;
  agent_id: string;
  signal_id: string;
  signal_data: SignalContent;
  status: SignalJobStatus;
  should_trade: boolean | null;
  evaluation_reason: string | null;
  evaluation_confidence: number | null;
  trade_id: string | null;
  trade_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateSignalJobParams {
  walletAddress: string;
  agentId: string;
  signalId: string;
  signalData: SignalContent;
}

class SignalJobsService {
  private supabase = supabaseService;
  private processingInterval: NodeJS.Timeout | null = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // JOB QUEUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new signal processing job
   */
  async createJob(params: CreateSignalJobParams): Promise<SignalJob | null> {
    const { walletAddress, agentId, signalId, signalData } = params;

    try {
      const { data, error } = await this.supabase.getClient()
        .from('signal_jobs')
        .insert({
          user_wallet_address: walletAddress,
          agent_id: agentId,
          signal_id: signalId,
          signal_data: signalData,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating signal job', error);
        return null;
      }

      logger.info(`Created signal job ${data.id} for agent ${agentId}`);
      return data;
    } catch (error) {
      logger.error('Error creating signal job', error);
      return null;
    }
  }

  /**
   * Get pending jobs for processing
   */
  async getPendingJobs(limit: number = 10): Promise<SignalJob[]> {
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error fetching pending jobs', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<SignalJob | null> {
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      logger.error('Error fetching job', error);
      return null;
    }

    return data;
  }

  /**
   * Get jobs by signal ID
   */
  async getJobsBySignal(signalId: string): Promise<SignalJob[]> {
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .select('*')
      .eq('signal_id', signalId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching jobs by signal', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get active jobs for a user (pending or processing)
   */
  async getActiveJobsForUser(walletAddress: string): Promise<SignalJob[]> {
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .select('*')
      .eq('user_wallet_address', walletAddress)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching active jobs', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get recent jobs for a user (last 24 hours)
   */
  async getRecentJobsForUser(walletAddress: string, limit: number = 20): Promise<SignalJob[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .select('*')
      .eq('user_wallet_address', walletAddress)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching recent jobs', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark job as processing
   */
  async markProcessing(jobId: string): Promise<boolean> {
    const { error } = await this.supabase.getClient()
      .from('signal_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error('Error marking job as processing', error);
      return false;
    }

    return true;
  }

  /**
   * Mark job as completed with evaluation results
   */
  async markCompleted(
    jobId: string,
    result: {
      shouldTrade: boolean;
      reason: string;
      confidence: number;
      tradeId?: string;
      tradeError?: string;
    }
  ): Promise<boolean> {
    const status: SignalJobStatus = result.shouldTrade && result.tradeId ? 'completed' : 'skipped';
    
    const { error } = await this.supabase.getClient()
      .from('signal_jobs')
      .update({
        status,
        should_trade: result.shouldTrade,
        evaluation_reason: result.reason,
        evaluation_confidence: result.confidence,
        trade_id: result.tradeId || null,
        trade_error: result.tradeError || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error('Error marking job as completed', error);
      return false;
    }

    return true;
  }

  /**
   * Mark job as failed
   */
  async markFailed(jobId: string, error: string): Promise<boolean> {
    const { error: dbError } = await this.supabase.getClient()
      .from('signal_jobs')
      .update({
        status: 'failed',
        trade_error: error,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (dbError) {
      logger.error('Error marking job as failed', dbError);
      return false;
    }

    return true;
  }

  /**
   * Clean up old completed/failed jobs (older than 7 days)
   */
  async cleanupOldJobs(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .delete()
      .in('status', ['completed', 'failed', 'skipped'])
      .lt('completed_at', sevenDaysAgo)
      .select('id');

    if (error) {
      logger.error('Error cleaning up old jobs', error);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      logger.info(`Cleaned up ${count} old signal jobs`);
    }
    
    return count;
  }

  /**
   * Reset stale processing jobs (stuck for more than 5 minutes)
   */
  async resetStaleJobs(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .update({
        status: 'pending',
        started_at: null,
      })
      .eq('status', 'processing')
      .lt('started_at', fiveMinutesAgo)
      .select('id');

    if (error) {
      logger.error('Error resetting stale jobs', error);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      logger.warn(`Reset ${count} stale signal jobs`);
    }
    
    return count;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get job statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
  }> {
    const { data, error } = await this.supabase.getClient()
      .from('signal_jobs')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      logger.error('Error fetching job stats', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 };
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const job of data || []) {
      if (job.status in stats) {
        stats[job.status as keyof typeof stats]++;
      }
    }

    return stats;
  }
}

export const signalJobsService = new SignalJobsService();
