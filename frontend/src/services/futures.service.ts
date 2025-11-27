import { api } from './api.service';
import type {
  FuturesAgent,
  FuturesTrade,
  FuturesPosition,
  FuturesAccountInfo,
  CreateAgentParams,
  UpdateAgentParams,
  NetworkMode,
  SignalJob,
} from '../types/futures.types';

// ═══════════════════════════════════════════════════════════════════════════════
// FUTURES AGENTS SERVICE
// Frontend API client for Diamond-tier automated trading on Hyperliquid
// ═══════════════════════════════════════════════════════════════════════════════

export const futuresService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY MANAGEMENT (Uses private key for Hyperliquid)
  // ═══════════════════════════════════════════════════════════════════════════

  async saveApiKeys(
    connectedWallet: string, 
    hyperliquidWallet: string, 
    privateKey: string,
    networkMode: NetworkMode = 'testnet'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await api.post('/futures/api-keys', {
        walletAddress: connectedWallet,           // Connected wallet (for DB lookup)
        hyperliquidWalletAddress: hyperliquidWallet, // Hyperliquid wallet address
        privateKey,                               // Hyperliquid private key
        networkMode,                              // Network mode (mainnet or testnet)
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  async testApiKeys(walletAddress: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const response = await api.post('/futures/api-keys/test', { walletAddress });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  async deleteApiKeys(walletAddress: string): Promise<boolean> {
    try {
      await api.delete('/futures/api-keys', { data: { walletAddress } });
      return true;
    } catch {
      return false;
    }
  },

  async getApiKeysStatus(walletAddress: string): Promise<{ hasApiKeys: boolean; balance?: number; networkMode?: NetworkMode }> {
    try {
      const response = await api.get('/futures/api-keys/status', {
        params: { walletAddress },
      });
      return response.data;
    } catch {
      return { hasApiKeys: false };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async getAgents(walletAddress: string): Promise<FuturesAgent[]> {
    try {
      const response = await api.get('/futures/agents', {
        params: { walletAddress },
      });
      return response.data.data || [];
    } catch {
      return [];
    }
  },

  async createAgent(params: CreateAgentParams): Promise<FuturesAgent | null> {
    try {
      const response = await api.post('/futures/agents', params);
      return response.data.data;
    } catch (error: any) {
      console.error('Create agent error:', error.response?.data);
      return null;
    }
  },

  async updateAgent(params: UpdateAgentParams): Promise<FuturesAgent | null> {
    try {
      const response = await api.put('/futures/agents', params);
      return response.data.data;
    } catch (error: any) {
      console.error('Update agent error:', error.response?.data);
      return null;
    }
  },

  async deleteAgent(walletAddress: string, agentId: string): Promise<boolean> {
    try {
      await api.delete(`/futures/agents/${agentId}`, { data: { walletAddress } });
      return true;
    } catch {
      return false;
    }
  },

  async duplicateAgent(walletAddress: string, agentId: string): Promise<FuturesAgent | null> {
    try {
      const response = await api.post(`/futures/agents/${agentId}/duplicate`, { walletAddress });
      return response.data.data;
    } catch {
      return null;
    }
  },

  async toggleAgent(walletAddress: string, agentId: string, isActive: boolean): Promise<FuturesAgent | null> {
    return this.updateAgent({ walletAddress, agentId, isActive });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITIONS & TRADES
  // ═══════════════════════════════════════════════════════════════════════════

  async getPositions(walletAddress: string): Promise<FuturesPosition[]> {
    try {
      const response = await api.get('/futures/positions', {
        params: { walletAddress },
      });
      return response.data.data || [];
    } catch {
      return [];
    }
  },

  async getTrades(walletAddress: string, limit: number = 50): Promise<FuturesTrade[]> {
    try {
      const response = await api.get('/futures/trades', {
        params: { walletAddress, limit },
      });
      return response.data.data || [];
    } catch {
      return [];
    }
  },

  async closePosition(walletAddress: string, symbol: string): Promise<boolean> {
    try {
      await api.post(`/futures/positions/${symbol}/close`, { walletAddress });
      return true;
    } catch {
      return false;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT INFO
  // ═══════════════════════════════════════════════════════════════════════════

  async getAccountInfo(walletAddress: string): Promise<FuturesAccountInfo | null> {
    try {
      const response = await api.get('/futures/account', {
        params: { walletAddress },
      });
      return response.data.data;
    } catch {
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMERGENCY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async emergencyCloseAll(walletAddress: string): Promise<{ closed: string[]; errors: string[] }> {
    try {
      const response = await api.post('/futures/emergency/close-all', { walletAddress });
      return response.data;
    } catch {
      return { closed: [], errors: ['Failed to execute emergency close'] };
    }
  },

  async deactivateAllAgents(walletAddress: string): Promise<number> {
    try {
      const response = await api.post('/futures/emergency/deactivate-all', { walletAddress });
      return response.data.deactivatedCount || 0;
    } catch {
      return 0;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNAL JOBS (Background processing for custom agents)
  // ═══════════════════════════════════════════════════════════════════════════

  async getSignalJobs(walletAddress: string): Promise<{ active: SignalJob[]; recent: SignalJob[] }> {
    try {
      const response = await api.get('/futures/jobs', {
        params: { walletAddress },
      });
      return response.data.data || { active: [], recent: [] };
    } catch {
      return { active: [], recent: [] };
    }
  },

  async getSignalJob(jobId: string): Promise<SignalJob | null> {
    try {
      const response = await api.get(`/futures/jobs/${jobId}`);
      return response.data.data;
    } catch {
      return null;
    }
  },
};
