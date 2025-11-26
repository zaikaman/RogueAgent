import { SupabaseService } from './supabase.service';
import { createHyperliquidService, HyperliquidService } from './hyperliquid.service';
import { logger } from '../utils/logger.util';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// FUTURES AGENTS SERVICE
// Manages Diamond-tier user agents for automated Hyperliquid Testnet trading
// ═══════════════════════════════════════════════════════════════════════════════

// Database types
export interface FuturesApiKeys {
  id: string;
  user_wallet_address: string;
  hyperliquid_wallet_address: string; // The Hyperliquid wallet address
  encrypted_api_key: string; // Encrypted private key
  encrypted_api_secret: string;
  is_active: boolean;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FuturesAgent {
  id: string;
  user_wallet_address: string;
  name: string;
  type: 'classic' | 'custom';
  is_active: boolean;
  risk_per_trade: number; // 0.5 - 5%
  max_concurrent_positions: number; // 1 - 10
  max_leverage: number; // 1 - 100 (actual max depends on asset)
  custom_prompt: string | null; // Natural language instructions
  stats: FuturesAgentStats;
  created_at: string;
  updated_at: string;
}

export interface FuturesAgentStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl_usd: number;
  total_pnl_percent: number;
  max_drawdown_percent: number;
  trades_today: number;
  last_trade_at: string | null;
}

export interface FuturesTrade {
  id: string;
  agent_id: string;
  user_wallet_address: string;
  signal_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  leverage: number;
  risk_percent: number;
  pnl_usd: number | null;
  pnl_percent: number | null;
  status: 'open' | 'tp_hit' | 'sl_hit' | 'closed' | 'error';
  entry_order_id: string;
  tp_order_id: string | null;
  sl_order_id: string | null;
  error_message: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface FuturesPosition {
  id: string;
  user_wallet_address: string;
  agent_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  current_price: number;
  quantity: number;
  leverage: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  liquidation_price: number;
  tp_price: number | null;
  sl_price: number | null;
  tp_order_id: string | null;
  sl_order_id: string | null;
  margin_type: 'isolated' | 'cross';
  opened_at: string;
  updated_at: string;
}

// Encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.FUTURES_ENCRYPTION_KEY || 'rogue-futures-encryption-key-32';

class FuturesAgentsService {
  private supabase: SupabaseService;
  private hyperliquidServices: Map<string, HyperliquidService> = new Map();
  
  constructor() {
    this.supabase = new SupabaseService();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENCRYPTION UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async saveApiKeys(
    walletAddress: string,          // Connected wallet (for DB lookup)
    hyperliquidWalletAddress: string, // Hyperliquid wallet address
    privateKey: string              // Hyperliquid private key
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Encrypt the private key
      const encryptedPrivateKey = this.encrypt(privateKey);

      // Test the connection first with the correct Hyperliquid wallet address
      const hyperliquid = createHyperliquidService(privateKey, hyperliquidWalletAddress, true); // true = testnet
      const testResult = await hyperliquid.testConnection();
      
      if (!testResult.success) {
        return { success: false, error: testResult.error || 'Failed to connect to Hyperliquid Testnet' };
      }

      // Upsert API keys (storing private key in encrypted_api_key field)
      const { error } = await this.supabase.getClient()
        .from('futures_api_keys')
        .upsert({
          user_wallet_address: walletAddress,
          hyperliquid_wallet_address: hyperliquidWalletAddress, // Store the HL wallet
          encrypted_api_key: encryptedPrivateKey,
          encrypted_api_secret: encryptedPrivateKey, // Same value for compat
          is_active: true,
          last_tested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_wallet_address',
        });

      if (error) throw error;

      // Clear cached service
      this.hyperliquidServices.delete(walletAddress);

      logger.info(`API keys saved for ${walletAddress}`);
      return { success: true };
    } catch (error: any) {
      logger.error('Error saving API keys', error);
      return { success: false, error: error.message };
    }
  }

  async getApiKeys(walletAddress: string): Promise<{ privateKey: string; hyperliquidWalletAddress: string } | null> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_api_keys')
      .select('*')
      .eq('user_wallet_address', walletAddress)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      privateKey: this.decrypt(data.encrypted_api_key),
      hyperliquidWalletAddress: data.hyperliquid_wallet_address,
    };
  }

  async deleteApiKeys(walletAddress: string): Promise<boolean> {
    const { error } = await this.supabase.getClient()
      .from('futures_api_keys')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_wallet_address', walletAddress);

    if (error) {
      logger.error('Error deleting API keys', error);
      return false;
    }

    this.hyperliquidServices.delete(walletAddress);
    return true;
  }

  async testApiKeys(walletAddress: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    const keys = await this.getApiKeys(walletAddress);
    if (!keys) {
      return { success: false, error: 'No private key found' };
    }

    // Use the Hyperliquid wallet address, not the connected wallet
    const hyperliquid = createHyperliquidService(keys.privateKey, keys.hyperliquidWalletAddress, true);
    return hyperliquid.testConnection();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HYPERLIQUID SERVICE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async getHyperliquidService(walletAddress: string): Promise<HyperliquidService | null> {
    // Check cache
    if (this.hyperliquidServices.has(walletAddress)) {
      return this.hyperliquidServices.get(walletAddress)!;
    }

    // Get keys and create service
    const keys = await this.getApiKeys(walletAddress);
    if (!keys) return null;

    // Use the Hyperliquid wallet address, not the connected wallet
    const service = createHyperliquidService(keys.privateKey, keys.hyperliquidWalletAddress, true); // true = testnet
    this.hyperliquidServices.set(walletAddress, service);
    return service;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async createAgent(params: {
    walletAddress: string;
    name: string;
    type: 'classic' | 'custom';
    riskPerTrade?: number;
    maxConcurrentPositions?: number;
    maxLeverage?: number;
    customPrompt?: string;
  }): Promise<FuturesAgent | null> {
    const {
      walletAddress,
      name,
      type,
      riskPerTrade = 1,
      maxConcurrentPositions = 3,
      maxLeverage = 20,
      customPrompt = null,
    } = params;

    // Validate classic agent uniqueness
    if (type === 'classic') {
      const existingClassic = await this.getClassicAgent(walletAddress);
      if (existingClassic) {
        logger.warn('User already has a classic agent');
        return null;
      }
    }

    const defaultStats: FuturesAgentStats = {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl_usd: 0,
      total_pnl_percent: 0,
      max_drawdown_percent: 0,
      trades_today: 0,
      last_trade_at: null,
    };

    const { data, error } = await this.supabase.getClient()
      .from('futures_agents')
      .insert({
        user_wallet_address: walletAddress,
        name,
        type,
        is_active: false, // Start inactive
        risk_per_trade: Math.min(5, Math.max(0.5, riskPerTrade)),
        max_concurrent_positions: Math.min(10, Math.max(1, maxConcurrentPositions)),
        max_leverage: Math.min(100, Math.max(1, maxLeverage)), // Capped at 100, actual max depends on asset
        custom_prompt: customPrompt,
        stats: defaultStats,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating agent', error);
      return null;
    }

    return data;
  }

  async updateAgent(
    agentId: string,
    walletAddress: string,
    updates: Partial<Pick<FuturesAgent, 'name' | 'is_active' | 'risk_per_trade' | 'max_concurrent_positions' | 'max_leverage' | 'custom_prompt'>>
  ): Promise<FuturesAgent | null> {
    // Validate ownership
    const { data: existing } = await this.supabase.getClient()
      .from('futures_agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_wallet_address', walletAddress)
      .single();

    if (!existing) {
      logger.warn('Agent not found or not owned by user');
      return null;
    }

    // Validate values
    if (updates.risk_per_trade !== undefined) {
      updates.risk_per_trade = Math.min(5, Math.max(0.5, updates.risk_per_trade));
    }
    if (updates.max_concurrent_positions !== undefined) {
      updates.max_concurrent_positions = Math.min(10, Math.max(1, updates.max_concurrent_positions));
    }
    if (updates.max_leverage !== undefined) {
      updates.max_leverage = Math.min(100, Math.max(1, updates.max_leverage)); // Capped at 100, actual max depends on asset
    }

    const { data, error } = await this.supabase.getClient()
      .from('futures_agents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', agentId)
      .eq('user_wallet_address', walletAddress)
      .select()
      .single();

    if (error) {
      logger.error('Error updating agent', error);
      return null;
    }

    return data;
  }

  async deleteAgent(agentId: string, walletAddress: string): Promise<boolean> {
    // Check for open positions
    const positions = await this.getAgentPositions(agentId);
    if (positions.length > 0) {
      logger.warn('Cannot delete agent with open positions');
      return false;
    }

    const { error } = await this.supabase.getClient()
      .from('futures_agents')
      .delete()
      .eq('id', agentId)
      .eq('user_wallet_address', walletAddress);

    if (error) {
      logger.error('Error deleting agent', error);
      return false;
    }

    return true;
  }

  async duplicateAgent(agentId: string, walletAddress: string): Promise<FuturesAgent | null> {
    const { data: original } = await this.supabase.getClient()
      .from('futures_agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_wallet_address', walletAddress)
      .single();

    if (!original || original.type === 'classic') {
      return null;
    }

    return this.createAgent({
      walletAddress,
      name: `${original.name} (Copy)`,
      type: 'custom',
      riskPerTrade: original.risk_per_trade,
      maxConcurrentPositions: original.max_concurrent_positions,
      maxLeverage: original.max_leverage,
      customPrompt: original.custom_prompt,
    });
  }

  async getClassicAgent(walletAddress: string): Promise<FuturesAgent | null> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_agents')
      .select('*')
      .eq('user_wallet_address', walletAddress)
      .eq('type', 'classic')
      .single();

    if (error) return null;
    return data;
  }

  async getUserAgents(walletAddress: string): Promise<FuturesAgent[]> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_agents')
      .select('*')
      .eq('user_wallet_address', walletAddress)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching user agents', error);
      return [];
    }

    return data || [];
  }

  async getActiveAgents(walletAddress?: string): Promise<FuturesAgent[]> {
    let query = this.supabase.getClient()
      .from('futures_agents')
      .select('*')
      .eq('is_active', true);

    if (walletAddress) {
      query = query.eq('user_wallet_address', walletAddress);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching active agents', error);
      return [];
    }

    return data || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async getAgentPositions(agentId: string): Promise<FuturesPosition[]> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_positions')
      .select('*')
      .eq('agent_id', agentId);

    if (error) {
      logger.error('Error fetching agent positions', error);
      return [];
    }

    return data || [];
  }

  async getUserPositions(walletAddress: string): Promise<FuturesPosition[]> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_positions')
      .select('*')
      .eq('user_wallet_address', walletAddress);

    if (error) {
      logger.error('Error fetching user positions', error);
      return [];
    }

    return data || [];
  }

  async syncPositions(walletAddress: string): Promise<void> {
    const hyperliquid = await this.getHyperliquidService(walletAddress);
    if (!hyperliquid) return;

    try {
      const positions = await hyperliquid.getFormattedPositions();
      
      // Update positions in database
      for (const position of positions) {
        await this.supabase.getClient()
          .from('futures_positions')
          .upsert({
            user_wallet_address: walletAddress,
            symbol: position.symbol,
            direction: position.direction,
            entry_price: position.entryPrice,
            current_price: position.currentPrice,
            quantity: position.quantity,
            leverage: position.leverage,
            unrealized_pnl: position.unrealizedPnl,
            unrealized_pnl_percent: position.unrealizedPnlPercent,
            liquidation_price: position.liquidationPrice,
            margin_type: position.marginType,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_wallet_address,symbol',
          });
      }

      // Remove closed positions
      const openSymbols = positions.map((p: { symbol: string }) => p.symbol);
      if (openSymbols.length > 0) {
        await this.supabase.getClient()
          .from('futures_positions')
          .delete()
          .eq('user_wallet_address', walletAddress)
          .not('symbol', 'in', `(${openSymbols.join(',')})`);
      } else {
        await this.supabase.getClient()
          .from('futures_positions')
          .delete()
          .eq('user_wallet_address', walletAddress);
      }
    } catch (error) {
      logger.error('Error syncing positions', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRADE HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  async getAgentTrades(agentId: string, limit: number = 50): Promise<FuturesTrade[]> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_trades')
      .select('*')
      .eq('agent_id', agentId)
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching agent trades', error);
      return [];
    }

    return data || [];
  }

  async getUserTrades(walletAddress: string, limit: number = 50): Promise<FuturesTrade[]> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_trades')
      .select('*')
      .eq('user_wallet_address', walletAddress)
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching user trades', error);
      return [];
    }

    return data || [];
  }

  async recordTrade(trade: Omit<FuturesTrade, 'id'>): Promise<FuturesTrade | null> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_trades')
      .insert(trade)
      .select()
      .single();

    if (error) {
      logger.error('Error recording trade', error);
      return null;
    }

    // Update agent stats
    await this.updateAgentStats(trade.agent_id);

    return data;
  }

  async updateAgentStats(agentId: string): Promise<void> {
    const trades = await this.getAgentTrades(agentId, 1000);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: FuturesAgentStats = {
      total_trades: trades.length,
      winning_trades: trades.filter(t => (t.pnl_usd || 0) > 0).length,
      losing_trades: trades.filter(t => (t.pnl_usd || 0) < 0).length,
      total_pnl_usd: trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0),
      total_pnl_percent: trades.reduce((sum, t) => sum + (t.pnl_percent || 0), 0),
      max_drawdown_percent: 0, // Calculate proper drawdown
      trades_today: trades.filter(t => new Date(t.opened_at) >= today).length,
      last_trade_at: trades.length > 0 ? trades[0].opened_at : null,
    };

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;
    
    for (const trade of trades.reverse()) {
      runningPnl += trade.pnl_percent || 0;
      if (runningPnl > peak) peak = runningPnl;
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    stats.max_drawdown_percent = maxDrawdown;

    await this.supabase.getClient()
      .from('futures_agents')
      .update({ stats, updated_at: new Date().toISOString() })
      .eq('id', agentId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAMOND USERS
  // ═══════════════════════════════════════════════════════════════════════════

  async getDiamondUsersWithActiveAgents(): Promise<Array<{ walletAddress: string; agents: FuturesAgent[] }>> {
    // Get all diamond users with API keys
    const { data: users, error: usersError } = await this.supabase.getClient()
      .from('users')
      .select('wallet_address')
      .eq('tier', 'DIAMOND');

    if (usersError || !users) return [];

    const result: Array<{ walletAddress: string; agents: FuturesAgent[] }> = [];

    for (const user of users) {
      // Check if user has API keys
      const hasKeys = await this.getApiKeys(user.wallet_address);
      if (!hasKeys) continue;

      // Get active agents
      const agents = await this.getActiveAgents(user.wallet_address);
      if (agents.length === 0) continue;

      result.push({
        walletAddress: user.wallet_address,
        agents,
      });
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMERGENCY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async emergencyCloseAll(walletAddress: string): Promise<{ closed: string[]; errors: string[] }> {
    const hyperliquid = await this.getHyperliquidService(walletAddress);
    if (!hyperliquid) {
      return { closed: [], errors: ['No Hyperliquid service available'] };
    }

    const result = await hyperliquid.closeAllPositions();
    
    // Update database
    if (result.closed.length > 0) {
      await this.syncPositions(walletAddress);
    }

    return result;
  }

  async deactivateAllAgents(walletAddress: string): Promise<number> {
    const { data, error } = await this.supabase.getClient()
      .from('futures_agents')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_wallet_address', walletAddress)
      .select();

    if (error) {
      logger.error('Error deactivating agents', error);
      return 0;
    }

    return data?.length || 0;
  }
}

export const futuresAgentsService = new FuturesAgentsService();
