import { supabaseService } from './supabase.service';
import { YieldAgent, buildYieldPrompt, ExistingYield } from '../agents/yield.agent';
import { logger } from '../utils/logger.util';

// Scan interval in milliseconds (6 hours)
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;

class YieldMarketsService {
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning = false;
  private lastScanTime: Date | null = null;

  /**
   * Run a full yield analysis scan
   */
  async runScan(): Promise<any[]> {
    if (this.isScanning) {
      logger.warn('[YieldMarkets] Scan already in progress, skipping...');
      return [];
    }

    this.isScanning = true;
    logger.info('[YieldMarkets] Starting yield opportunities scan with verification...');

    try {
      // Step 1: Get all existing yield opportunities from database
      const existingYields = await supabaseService.getAllYieldOpportunities();
      logger.info(`[YieldMarkets] Found ${existingYields.length} existing yield opportunities to verify`);

      // Step 2: Build prompt with existing data for verification
      const prompt = buildYieldPrompt(existingYields as ExistingYield[]);

      // Step 3: Run agent with existing data context
      const { runner } = await YieldAgent.build();
      const result = await runner.ask(prompt) as any;

      // Step 4: Replace ALL data with verified + new opportunities
      if (result.opportunities && Array.isArray(result.opportunities)) {
        logger.info(`[YieldMarkets] Agent returned ${result.opportunities.length} verified yield opportunities. Replacing DB...`);
        await supabaseService.replaceAllYieldOpportunities(result.opportunities);
        this.lastScanTime = new Date();
        logger.info(`[YieldMarkets] Successfully replaced yield opportunities in DB`);
        return result.opportunities;
      } else {
        logger.warn('[YieldMarkets] No yield opportunities returned. Clearing old data...');
        await supabaseService.replaceAllYieldOpportunities([]);
        this.lastScanTime = new Date();
        return [];
      }
    } catch (error) {
      logger.error('[YieldMarkets] Scan failed:', error);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Check if database has any yield opportunities
   */
  async hasOpportunities(): Promise<boolean> {
    try {
      const opportunities = await supabaseService.getAllYieldOpportunities();
      return opportunities.length > 0;
    } catch (error) {
      logger.error('[YieldMarkets] Error checking opportunities:', error);
      return false;
    }
  }

  /**
   * Start the scheduled scanning process
   */
  async startScheduler(): Promise<void> {
    logger.info('[YieldMarkets] Starting yield markets scheduler (6h interval)');

    // Check if we need an immediate scan
    const hasExisting = await this.hasOpportunities();
    if (!hasExisting) {
      logger.info('[YieldMarkets] No opportunities in database, running immediate scan...');
      await this.runScan();
    }

    // Set up recurring scan every 6 hours
    this.scanInterval = setInterval(async () => {
      await this.runScan();
    }, SCAN_INTERVAL_MS);
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      logger.info('[YieldMarkets] Scheduler stopped');
    }
  }

  /**
   * Get scan status
   */
  getStatus() {
    return {
      isScanning: this.isScanning,
      lastScanTime: this.lastScanTime?.toISOString() || null,
      nextScanTime: this.lastScanTime 
        ? new Date(this.lastScanTime.getTime() + SCAN_INTERVAL_MS).toISOString()
        : null,
      scanIntervalHours: SCAN_INTERVAL_MS / (60 * 60 * 1000),
    };
  }
}

export const yieldMarketsService = new YieldMarketsService();
