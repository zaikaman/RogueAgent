import { fraxtalService } from '../services/fraxtal.service';
import { coingeckoService } from '../services/coingecko.service';
import { TIERS, TIER_THRESHOLDS, Tier } from '../constants/tiers';
import { logger } from '../utils/logger.util';

const RGE_TOKEN_ADDRESS = '0xe5Ee677388a6393d135bEd00213E150b1F64b032';
const FRAXTAL_PLATFORM_ID = 'fraxtal';

export class TierManager {
  
  async verifyTier(walletAddress: string): Promise<{ tier: Tier; balance: number; usdValue: number }> {
    try {
      // 1. Get Balance
      const balance = await fraxtalService.getRGEBalance(walletAddress);
      
      // 2. Get Price
      let price = await coingeckoService.getTokenPriceByAddress(FRAXTAL_PLATFORM_ID, RGE_TOKEN_ADDRESS);
      
      if (price === null) {
          logger.warn('Could not fetch RGE price, defaulting to 0 for safety');
          price = 0; 
      }

      // 3. Calculate USD Value
      const usdValue = balance * price;

      // 4. Determine Tier
      let tier: Tier = TIERS.NONE;
      if (usdValue >= TIER_THRESHOLDS.DIAMOND) {
        tier = TIERS.DIAMOND;
      } else if (usdValue >= TIER_THRESHOLDS.GOLD) {
        tier = TIERS.GOLD;
      } else if (usdValue >= TIER_THRESHOLDS.SILVER) {
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
