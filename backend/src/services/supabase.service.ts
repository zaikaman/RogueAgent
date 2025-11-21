import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env.config';
import { RunSchema, UserSchema } from '../types/validation';
import { z } from 'zod';

// Database types based on our schema
export type DbRun = {
  id?: string;
  type: 'signal' | 'intel' | 'skip';
  content: any;
  public_posted_at?: string | null;
  telegram_delivered_at?: string | null;
  confidence_score?: number | null;
  cycle_started_at?: string;
  cycle_completed_at?: string | null;
  execution_time_ms?: number | null;
  error_message?: string | null;
  created_at?: string;
};

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
      console.warn('⚠️ Supabase credentials missing. Database service will not function.');
    }
    
    this.client = createClient(
      config.SUPABASE_URL || '',
      config.SUPABASE_SERVICE_KEY || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  async createRun(runData: DbRun) {
    const { data, error } = await this.client
      .from('runs')
      .insert(runData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRun(id: string, updates: Partial<DbRun>) {
    const { data, error } = await this.client
      .from('runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLatestRun() {
    const { data, error } = await this.client
      .from('runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data;
  }

  async getUser(walletAddress: string) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) return null;
    return data;
  }

  async getUserByTelegramId(telegramId: number) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('telegram_user_id', telegramId)
      .single();

    if (error) return null;
    return data;
  }

  async getSubscribedUsers() {
    // Fetch users who have a telegram_user_id (meaning they verified/started bot)
    // and have a tier other than NONE (optional, but makes sense for "signals")
    const { data, error } = await this.client
      .from('users')
      .select('telegram_user_id, telegram_username, tier')
      .not('telegram_user_id', 'is', null);

    if (error) {
      console.error('Error fetching subscribed users:', error);
      return [];
    }
    return data;
  }

  async hasRecentSignal(symbol: string, days: number = 7): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.client
      .from('runs')
      .select('id')
      .eq('type', 'signal')
      .gte('created_at', cutoffDate.toISOString())
      .filter('content->token->>symbol', 'eq', symbol)
      .limit(1);

    if (error) {
      console.error('Error checking recent signals:', error);
      return false;
    }

    return data && data.length > 0;
  }

  async getRecentSignalCount(hours: number = 24): Promise<number> {
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { count, error } = await this.client
      .from('runs')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'signal')
      .gte('created_at', timeAgo);

    if (error) {
      console.error('Error fetching recent signal count:', error);
      return 0;
    }
    
    return count || 0;
  }

  async getRecentIntelTopics(limit: number = 5): Promise<string[]> {
    const { data, error } = await this.client
      .from('runs')
      .select('content')
      .eq('type', 'intel')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent intel topics:', error);
      return [];
    }

    return data.map((row: any) => row.content?.topic).filter(Boolean);
  }

  async getLogs(limit: number = 10, offset: number = 0) {
    const { data, error, count } = await this.client
      .from('runs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, count };
  }

  async upsertUser(userData: {
    wallet_address: string;
    tier?: string;
    rge_balance_usd?: number;
    last_verified_at?: string;
    telegram_user_id?: number;
    telegram_username?: string;
  }) {
    const { data, error } = await this.client
      .from('users')
      .upsert(userData, { onConflict: 'wallet_address' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCustomRequestsCount(walletAddress: string, since: string) {
    const { count, error } = await this.client
      .from('custom_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_wallet_address', walletAddress)
      .gte('requested_at', since);

    if (error) throw error;
    return count || 0;
  }

  async createCustomRequest(requestData: {
    user_wallet_address: string;
    token_symbol: string;
    token_contract?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }) {
    const { data, error } = await this.client
      .from('custom_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCustomRequest(id: string, updates: any) {
    const { data, error } = await this.client
      .from('custom_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLatestSignal() {
    const { data, error } = await this.client
      .from('runs')
      .select('*')
      .eq('type', 'signal')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getLatestIntel() {
    const { data, error } = await this.client
      .from('runs')
      .select('*')
      .eq('type', 'intel')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRecentPosts(limit: number = 10): Promise<string[]> {
    const { data, error } = await this.client
      .from('runs')
      .select('content')
      .in('type', ['signal', 'intel'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent posts:', error);
      return [];
    }

    return data.map((row: any) => {
      if (row.content?.formatted_tweet) return row.content.formatted_tweet;
      if (row.content?.insight) return row.content.insight;
      return null;
    }).filter(Boolean);
  }
}

export const supabaseService = new SupabaseService();
