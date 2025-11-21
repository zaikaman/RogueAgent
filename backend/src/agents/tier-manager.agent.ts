import { fraxtalService } from '../services/fraxtal.service';
import { TIERS, TIER_THRESHOLDS, Tier } from '../constants/tiers';
import { logger } from '../utils/logger.util';

export class TierManager {
  
  async verifyTier(walletAddress: string): Promise<{ tier: Tier; balance: number }> {
    try {
      // 1. Get Balance
      const balance = await fraxtalService.getRGEBalance(walletAddress);
      
      // 2. Determine Tier
      let tier: Tier = TIERS.NONE;
      if (balance >= TIER_THRESHOLDS.DIAMOND) {
        tier = TIERS.DIAMOND;
      } else if (balance >= TIER_THRESHOLDS.GOLD) {
        tier = TIERS.GOLD;
      } else if (balance >= TIER_THRESHOLDS.SILVER) {
        tier = TIERS.SILVER;
      }

      logger.info(`Verified tier for ${walletAddress}: ${tier} (${balance.toFixed(2)} RGE)`);

      return { tier, balance };
    } catch (error) {
      logger.error(`Error verifying tier for ${walletAddress}`, error);
      throw error;
    }
  }
}

export const tierManager = new TierManager();
