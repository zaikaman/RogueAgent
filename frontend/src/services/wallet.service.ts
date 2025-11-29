import { api } from './api.service';
import { Tier } from '../constants/tiers';

export const walletService = {
  async verifyTier(walletAddress: string): Promise<{ tier: Tier; balance: number; telegram_connected: boolean; hasTemporaryAccess?: boolean }> {
    const response = await api.post('/tiers/verify', { walletAddress });
    return response.data.data;
  },

  async grantTemporaryAccess(walletAddress: string): Promise<{ message: string; expiresAt: string }> {
    const response = await api.post('/tiers/grant-temporary-access', { walletAddress });
    return response.data.data;
  }
};
