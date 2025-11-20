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

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}

export const supabaseService = new SupabaseService();
