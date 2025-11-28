import { supabaseService } from './supabase.service';
import { PredictorAgent, PredictorOutput, buildPredictorPrompt, ExistingPrediction } from '../agents/predictor.agent';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';

interface AnalyzedMarket {
  market_id: string;
  platform: string;
  title: string;
  category: string | null;
  yes_price: number;
  implied_probability: number;
  rogue_probability: number;
  edge_percent: number;
  recommended_bet: 'BUY YES' | 'BUY NO' | 'HOLD';
  confidence_score: number;
  volume_usd: number;
  market_url: string;
  analysis_reasoning: string;
  last_analyzed_at: string;
}

// Minimum edge threshold for displaying markets
const MIN_EDGE_THRESHOLD = 12;
// Scan interval in milliseconds (6 hours)
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Max retries for agent calls
const MAX_RETRIES = 3;

class PredictionMarketsService {
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning = false;
  private lastScanTime: Date | null = null;

  /**
   * Call the predictor agent with existing data for verification
   */
  private async callPredictorAgent(existingMarkets: ExistingPrediction[]): Promise<PredictorOutput> {
    // Build prompt with existing data for verification
    const prompt = buildPredictorPrompt(existingMarkets);
    
    const { runner } = await PredictorAgent.build();
    const output = await runner.ask(prompt) as PredictorOutput;
    
    if (!output?.analyzed_markets || !Array.isArray(output.analyzed_markets)) {
      throw new Error('Invalid response format - missing analyzed_markets array');
    }
    
    return output;
  }

  /**
   * Let the AI agent find and analyze prediction markets using web search and X
   * Also verifies existing markets and removes outdated ones
   */
  async discoverAndAnalyzeMarkets(): Promise<AnalyzedMarket[]> {
    logger.info('[PredictionMarkets] Starting AI market discovery with verification...');

    try {
      // Step 1: Get all existing markets from database for verification
      const existingMarkets = await supabaseService.getAllPredictionMarkets();
      logger.info(`[PredictionMarkets] Found ${existingMarkets.length} existing markets to verify`);

      // Call agent with retry logic and existing data
      const output = await retry(
        () => this.callPredictorAgent(existingMarkets as ExistingPrediction[]),
        MAX_RETRIES,
        2000, // 2s initial delay
        2,    // 2x backoff
        (error) => {
          // Retry on schema validation errors or network issues
          const errorMsg = error?.message || '';
          return errorMsg.includes('schema') || 
                 errorMsg.includes('validation') || 
                 errorMsg.includes('Invalid response') ||
                 errorMsg.includes('parse');
        }
      );

      if (!output?.analyzed_markets?.length) {
        logger.warn('[PredictionMarkets] No analyzed markets in response');
        return [];
      }

      const now = new Date().toISOString();
      const analyzedMarkets: AnalyzedMarket[] = [];

      for (const analysis of output.analyzed_markets) {
        // Use edge from agent, or calculate if not provided
        const edge = analysis.edge_percent ?? Math.abs(analysis.rogue_probability - analysis.implied_probability);

        if (edge < MIN_EDGE_THRESHOLD) continue;

        analyzedMarkets.push({
          market_id: analysis.market_id,
          platform: analysis.platform || 'Polymarket',
          title: analysis.title,
          category: analysis.category || null,
          yes_price: analysis.yes_price,
          implied_probability: analysis.implied_probability,
          rogue_probability: analysis.rogue_probability,
          edge_percent: edge,
          recommended_bet: analysis.recommended_bet,
          confidence_score: analysis.confidence_score,
          volume_usd: analysis.volume_usd || 0,
          market_url: analysis.market_url || `https://polymarket.com/event/${analysis.market_id}`,
          analysis_reasoning: analysis.reasoning,
          last_analyzed_at: now,
        });
      }

      // Sort by confidence score descending
      analyzedMarkets.sort((a, b) => b.confidence_score - a.confidence_score);

      logger.info(`[PredictionMarkets] AI discovered ${analyzedMarkets.length} high-edge markets`);
      return analyzedMarkets;
    } catch (error) {
      logger.error('[PredictionMarkets] Error in AI market discovery:', error);
      return [];
    }
  }

  /**
   * Replace ALL markets in database with new verified list
   */
  async saveMarkets(markets: AnalyzedMarket[]): Promise<void> {
    try {
      // Prepare data for insert
      const insertData = markets.map(m => ({
        market_id: m.market_id,
        platform: m.platform,
        title: m.title,
        category: m.category,
        yes_price: m.yes_price,
        implied_probability: m.implied_probability,
        rogue_probability: m.rogue_probability,
        edge_percent: m.edge_percent,
        recommended_bet: m.recommended_bet,
        confidence_score: m.confidence_score,
        volume_usd: m.volume_usd,
        market_url: m.market_url,
        analysis_reasoning: m.analysis_reasoning,
        is_active: true,
        last_analyzed_at: m.last_analyzed_at,
      }));

      // Replace all markets in database
      await supabaseService.replaceAllPredictionMarkets(insertData);
      
      logger.info(`[PredictionMarkets] Replaced database with ${markets.length} verified markets`);
    } catch (error) {
      logger.error('[PredictionMarkets] Error saving markets:', error);
    }
  }

  /**
   * Get high-edge markets from database
   */
  async getHighEdgeMarkets(limit = 15): Promise<AnalyzedMarket[]> {
    try {
      const client = supabaseService.getClient();
      
      const { data, error } = await client
        .from('prediction_markets_cache')
        .select('*')
        .eq('is_active', true)
        .gte('edge_percent', MIN_EDGE_THRESHOLD)
        .order('confidence_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return (data || []) as AnalyzedMarket[];
    } catch (error) {
      logger.error('[PredictionMarkets] Error fetching markets:', error);
      return [];
    }
  }

  /**
   * Get a single featured market for public demo
   */
  async getFeaturedMarket(): Promise<AnalyzedMarket | null> {
    try {
      const client = supabaseService.getClient();
      
      const { data, error } = await client
        .from('prediction_markets_cache')
        .select('*')
        .eq('is_active', true)
        .gte('edge_percent', MIN_EDGE_THRESHOLD)
        .order('confidence_score', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data as AnalyzedMarket | null;
    } catch (error) {
      logger.error('[PredictionMarkets] Error fetching featured market:', error);
      return null;
    }
  }

  /**
   * Check if database has any markets
   */
  async hasMarkets(): Promise<boolean> {
    try {
      const client = supabaseService.getClient();
      
      const { count, error } = await client
        .from('prediction_markets_cache')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) throw error;
      
      return (count || 0) > 0;
    } catch (error) {
      logger.error('[PredictionMarkets] Error checking markets:', error);
      return false;
    }
  }

  /**
   * Run a full scan: AI verifies existing markets, discovers new ones, and replaces DB
   */
  async runScan(): Promise<AnalyzedMarket[]> {
    if (this.isScanning) {
      logger.warn('[PredictionMarkets] Scan already in progress, skipping...');
      return [];
    }

    this.isScanning = true;
    logger.info('[PredictionMarkets] Starting AI prediction markets scan with verification...');

    try {
      // Let AI verify existing and discover new markets
      const analyzedMarkets = await this.discoverAndAnalyzeMarkets();

      // Save to database (replaces all existing data)
      await this.saveMarkets(analyzedMarkets);

      this.lastScanTime = new Date();
      
      if (analyzedMarkets.length === 0) {
        logger.warn('[PredictionMarkets] No high-edge markets found. Database cleared.');
      } else {
        logger.info(`[PredictionMarkets] Scan complete. Database now has ${analyzedMarkets.length} verified markets`);
      }
      
      return analyzedMarkets;
    } catch (error) {
      logger.error('[PredictionMarkets] Scan failed:', error);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Start the scheduled scanning process
   */
  async startScheduler(): Promise<void> {
    logger.info('[PredictionMarkets] Starting prediction markets scheduler (6h interval)');

    // Check if we need an immediate scan
    const hasExistingMarkets = await this.hasMarkets();
    if (!hasExistingMarkets) {
      logger.info('[PredictionMarkets] No markets in database, running immediate scan...');
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
      logger.info('[PredictionMarkets] Scheduler stopped');
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

export const predictionMarketsService = new PredictionMarketsService();
