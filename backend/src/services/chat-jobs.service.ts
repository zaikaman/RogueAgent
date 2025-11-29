import { supabaseService } from './supabase.service';
import { logger } from '../utils/logger.util';

export interface ChatJob {
  id: string;
  user_wallet_address: string;
  message: string;
  context: any;
  history: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  response?: string;
  source?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface CreateChatJobParams {
  user_wallet_address: string;
  message: string;
  context: any;
  history: any[];
}

class ChatJobsService {
  private supabase = supabaseService;

  // ═══════════════════════════════════════════════════════════════════════════
  // JOB QUEUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new chat processing job
   */
  async createJob(params: CreateChatJobParams): Promise<ChatJob | null> {
    try {
      const { data, error } = await this.supabase.getClient()
        .from('chat_jobs')
        .insert({
          user_wallet_address: params.user_wallet_address,
          message: params.message,
          context: params.context,
          history: params.history,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating chat job', error);
        return null;
      }

      logger.info(`Created chat job ${data.id}`);
      return data;
    } catch (error) {
      logger.error('Error creating chat job', error);
      return null;
    }
  }

  /**
   * Get pending jobs for processing
   */
  async getPendingJobs(limit: number = 10): Promise<ChatJob[]> {
    const { data, error } = await this.supabase.getClient()
      .from('chat_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error fetching pending chat jobs', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<ChatJob | null> {
    const { data, error } = await this.supabase.getClient()
      .from('chat_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      logger.error('Error fetching chat job', error);
      return null;
    }

    return data;
  }

  /**
   * Mark job as processing
   */
  async markProcessing(jobId: string): Promise<boolean> {
    const { error } = await this.supabase.getClient()
      .from('chat_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error('Error marking chat job as processing', error);
      return false;
    }

    return true;
  }

  /**
   * Mark job as completed with response
   */
  async markCompleted(
    jobId: string,
    result: {
      response: string;
      source?: string;
    }
  ): Promise<boolean> {
    const { error } = await this.supabase.getClient()
      .from('chat_jobs')
      .update({
        status: 'completed',
        response: result.response,
        source: result.source,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error('Error marking chat job as completed', error);
      return false;
    }

    logger.info(`Completed chat job ${jobId}`);
    return true;
  }

  /**
   * Mark job as failed
   */
  async markFailed(jobId: string, errorMessage: string): Promise<boolean> {
    const { error } = await this.supabase.getClient()
      .from('chat_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error('Error marking chat job as failed', error);
      return false;
    }

    logger.error(`Failed chat job ${jobId}: ${errorMessage}`);
    return true;
  }

  /**
   * Reset stale jobs (processing for too long)
   */
  async resetStaleJobs(maxAgeMinutes: number = 5): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

    const { data, error } = await this.supabase.getClient()
      .from('chat_jobs')
      .update({ status: 'pending', started_at: null })
      .eq('status', 'processing')
      .lt('started_at', cutoffTime)
      .select();

    if (error) {
      logger.error('Error resetting stale chat jobs', error);
      return 0;
    }

    if (data && data.length > 0) {
      logger.warn(`Reset ${data.length} stale chat jobs`);
    }

    return data?.length || 0;
  }

  /**
   * Cleanup old completed jobs (older than 24 hours)
   */
  async cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase.getClient()
      .from('chat_jobs')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('completed_at', cutoffTime)
      .select();

    if (error) {
      logger.error('Error cleaning up old chat jobs', error);
      return 0;
    }

    if (data && data.length > 0) {
      logger.info(`Cleaned up ${data.length} old chat jobs`);
    }

    return data?.length || 0;
  }
}

export const chatJobsService = new ChatJobsService();
