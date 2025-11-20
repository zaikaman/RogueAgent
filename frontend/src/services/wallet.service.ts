import { api } from './api.service';
import { Tier } from '../constants/tiers';

export const walletService = {
  async verifyTier(walletAddress: string): Promise<{ tier: Tier; balance: number; usdValue: number }> {
    const response = await api.post('/tiers/verify', { walletAddress });
    return response.data.data;
  }
};
