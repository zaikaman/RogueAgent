import { fraxtalService } from '../services/fraxtal.service';
import { TIERS, TIER_THRESHOLDS, Tier } from '../constants/tiers';
import { logger } from '../utils/logger.util';
import { SupabaseService } from '../services/supabase.service';

const supabaseService = new SupabaseService();

export class TierManager {
  
  async verifyTier(walletAddress: string): Promise<{ tier: Tier; balance: number; hasTemporaryAccess: boolean }> {
    try {
      // 1. Check for temporary diamond access (for hackathon judges)
      const hasTemporaryAccess = await supabaseService.hasTemporaryDiamondAccess(walletAddress);
      
      // 2. Get actual RGE Balance
      const balance = await fraxtalService.getRGEBalance(walletAddress);
      
      // 3. Determine actual tier based on balance
      let actualTier: Tier = TIERS.NONE;
      if (balance >= TIER_THRESHOLDS.DIAMOND) {
        actualTier = TIERS.DIAMOND;
      } else if (balance >= TIER_THRESHOLDS.GOLD) {
        actualTier = TIERS.GOLD;
      } else if (balance >= TIER_THRESHOLDS.SILVER) {
        actualTier = TIERS.SILVER;
      }

      // 4. If user has temporary access, override to DIAMOND
      const tier = hasTemporaryAccess ? TIERS.DIAMOND : actualTier;

      if (hasTemporaryAccess) {
        logger.info(`Verified tier for ${walletAddress}: ${tier} (TEMP DIAMOND ACCESS) (actual: ${actualTier}, ${balance.toFixed(2)} RGE)`);
      } else {
        logger.info(`Verified tier for ${walletAddress}: ${tier} (${balance.toFixed(2)} RGE)`);
      }

      return { tier, balance, hasTemporaryAccess };
    } catch (error) {
      logger.error(`Error verifying tier for ${walletAddress}`, error);
      throw error;
    }
  }
}

export const tierManager = new TierManager();
