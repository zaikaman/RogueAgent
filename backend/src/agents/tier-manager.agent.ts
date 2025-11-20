import { fraxtalService } from '../services/fraxtal.service';
import { coingeckoService } from '../services/coingecko.service';
import { TIERS, TIER_THRESHOLDS, Tier, CONTRACTS } from '../constants/tiers';
import { logger } from '../utils/logger.util';

export class TierManager {
  
  async verifyTier(walletAddress: string): Promise<{ tier: Tier; balance: number; usdValue: number }> {
    try {
      // 1. Get Balance
      const balance = await fraxtalService.getRGEBalance(walletAddress);
      
      // 2. Get Price (Optional, for display only)
      let price = 0;
      try {
        const fetchedPrice = await coingeckoService.getTokenPriceByAddress(CONTRACTS.FRAXTAL_PLATFORM_ID, CONTRACTS.RGE_TOKEN);
        if (fetchedPrice !== null) {
          price = fetchedPrice;
        }
      } catch (err) {
        // Ignore price fetch errors, they shouldn't block tier verification
        logger.debug('Failed to fetch RGE price', err);
      }

      // 3. Calculate USD Value
      const usdValue = balance * price;

      // 4. Determine Tier
      let tier: Tier = TIERS.NONE;
      if (balance >= TIER_THRESHOLDS.DIAMOND) {
        tier = TIERS.DIAMOND;
      } else if (balance >= TIER_THRESHOLDS.GOLD) {
        tier = TIERS.GOLD;
      } else if (balance >= TIER_THRESHOLDS.SILVER) {
        tier = TIERS.SILVER;
      }

      logger.info(`Verified tier for ${walletAddress}: ${tier} ($${usdValue.toFixed(2)})`);

      return { tier, balance, usdValue };
    } catch (error) {
      logger.error(`Error verifying tier for ${walletAddress}`, error);
      throw error;
    }
  }
}

export const tierManager = new TierManager();
