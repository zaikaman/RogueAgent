import { supabaseService } from './supabase.service';
import { birdeyeService } from './birdeye.service';
import { coingeckoService } from './coingecko.service';
import { coinMarketCapService } from './coinmarketcap.service';
import { logger } from '../utils/logger.util';
import { cleanSignalText } from '../utils/text.util';
import { SignalContent } from '../../shared/types/signal.types';
import { GeneratorAgent } from '../agents/generator.agent';
import { telegramService } from './telegram.service';
import { twitterService } from './twitter.service';
import { TIERS } from '../constants/tiers';
import { scheduledPostService } from './scheduled-post.service';

interface GeneratorResult {
  formatted_content: string;
  tweet_text?: string;
  blog_post?: string;
  image_prompt?: string;
  log_message?: string;
}

export class SignalMonitorService {
  
  /**
   * Recalculate PnL for all historical signals using 1% fixed risk model
   * Call this once to migrate old data
   */
  async recalculateHistoricalPnL() {
    logger.info('Recalculating historical PnL with 1% risk model...');
    
    const { data: runs, error } = await supabaseService.getClient()
      .from('runs')
      .select('*')
      .eq('type', 'signal')
      .in('content->>status', ['tp_hit', 'sl_hit', 'closed']);

    if (error || !runs) {
      logger.error('Failed to fetch historical signals:', error);
      return;
    }

    logger.info(`Found ${runs.length} closed signals to recalculate`);
    const RISK_PER_TRADE = 1;

    for (const run of runs) {
      const content = run.content as SignalContent;
      
      // Skip if missing required prices
      if (!content.entry_price || !content.stop_loss || !content.target_price) {
        logger.warn(`Signal ${run.id} missing price data, skipping`);
        continue;
      }

      const entryPrice = content.entry_price;
      const risk = entryPrice - content.stop_loss;
      const reward = content.target_price - entryPrice;
      const rrRatio = risk > 0 ? reward / risk : 1;

      let newPnL: number;
      if (content.status === 'tp_hit') {
        newPnL = RISK_PER_TRADE * rrRatio;
      } else if (content.status === 'sl_hit') {
        newPnL = -RISK_PER_TRADE;
      } else {
        // closed manually - calculate based on close price if available
        const closePrice = content.current_price || entryPrice;
        const currentR = risk > 0 ? (closePrice - entryPrice) / risk : 0;
        newPnL = currentR * RISK_PER_TRADE;
      }

      const oldPnL = content.pnl_percent;
      content.pnl_percent = newPnL;

      await supabaseService.updateRun(run.id, { content });
      logger.info(`Signal ${run.id} (${content.token.symbol}): ${content.status} - Old PnL: ${oldPnL?.toFixed(2)}%, New PnL: ${newPnL.toFixed(2)}R (R:R ${rrRatio.toFixed(2)})`);
    }

    logger.info('Historical PnL recalculation complete!');
  }

  async checkActiveSignals() {
    logger.info('Checking active signals...');
    
    // Fetch the last 20 runs of type 'signal' to ensure we track recent history
    const { data: runs, error } = await supabaseService.getClient()
      .from('runs')
      .select('*')
      .eq('type', 'signal')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !runs || runs.length === 0) {
      logger.info('No signal runs found.');
      return;
    }

    logger.info(`Found ${runs.length} recent signals. Checking for active ones...`);

    // Pre-filter active signals and group by price lookup method
    const activeSignals = runs.filter(r => {
      const content = r.content as SignalContent;
      return content.status !== 'tp_hit' && content.status !== 'sl_hit' && content.status !== 'closed';
    });

    if (activeSignals.length === 0) {
      logger.info('No active signals to track.');
      return;
    }

    logger.info(`Tracking ${activeSignals.length} active signals (${runs.length - activeSignals.length} already closed)`);

    // Group tokens by lookup method for batch fetching
    const coingeckoIds: string[] = [];
    const tokenMap = new Map<string, any>();

    for (const run of activeSignals) {
      const content = run.content as SignalContent;
      const token = content.token;
      
      if ((token as any).coingecko_id) {
        coingeckoIds.push((token as any).coingecko_id);
        tokenMap.set((token as any).coingecko_id, { runId: run.id, content });
      }
    }

    // Batch fetch CoinGecko prices
    let batchPrices = new Map<string, number>();
    if (coingeckoIds.length > 0) {
      logger.info(`Batch fetching ${coingeckoIds.length} CoinGecko prices...`);
      batchPrices = await coingeckoService.getBatchPrices(coingeckoIds);
    }

    // Now process each signal with pre-fetched or individually fetched prices
    for (const run of activeSignals) {
        const content = run.content as SignalContent;

        // If already closed, skip
        if (content.status === 'tp_hit' || content.status === 'sl_hit' || content.status === 'closed') {
          continue;
        }

        logger.info(`Tracking signal: ${run.id} (${content.token.symbol}) Status: ${content.status || 'active'}`);

        // Get current price - use batch-fetched price if available
        let currentPrice: number | null = null;
        
        try {
            // Priority 1: Use batch-fetched CoinGecko price
            if ((content.token as any).coingecko_id) {
                currentPrice = batchPrices.get((content.token as any).coingecko_id) || null;
            }

            // Priority 2: Try address-based lookup (only if not in batch)
            if (!currentPrice && (content.token as any).chain && (content.token as any).address) {
                const chain = (content.token as any).chain;
                const address = (content.token as any).address;
                
                // Try CoinGecko by address
                currentPrice = await coingeckoService.getPriceByAddress(chain, address);
                
                // Fallback to Birdeye for chain-native tokens
                if (!currentPrice && ['solana', 'ethereum', 'base', 'arbitrum'].includes(chain)) {
                    const history = await birdeyeService.getPriceHistory(address, chain, 1);
                    if (history && history.length > 0) {
                        currentPrice = history[history.length - 1].value;
                    }
                }
            }

            // Priority 3: Fallback to CMC by symbol (for popular tokens)
            if (!currentPrice && content.token.symbol) {
                currentPrice = await coinMarketCapService.getPrice(content.token.symbol);
            }

            // Priority 4: Fallback to individual CoinGecko fetch by ID (if batch failed)
            if (!currentPrice && (content.token as any).coingecko_id && !batchPrices.has((content.token as any).coingecko_id)) {
                currentPrice = await coingeckoService.getPrice((content.token as any).coingecko_id);
            }
        } catch (err) {
            logger.error(`Error fetching price for ${content.token.symbol}:`, err);
            continue;
        }

        if (!currentPrice) {
            logger.warn(`Could not fetch price for signal ${run.id} (${content.token.symbol})`);
            continue;
        }

        // Handle PENDING signals (Limit Orders)
        if (content.status === 'pending') {
            const entryPrice = content.entry_price;
            
            // Validate entry price exists
            if (!entryPrice) {
                logger.error(`Pending signal ${run.id} has no entry_price. Skipping.`);
                continue;
            }
            
            // Check if price hit entry (0.5% tolerance for slippage)
            const isTriggered = currentPrice <= entryPrice * 1.005;

            if (isTriggered) {
                logger.info(`PENDING Signal ${run.id} TRIGGERED! Price ${currentPrice} <= Entry ${entryPrice}`);
                
                // If content already exists (new behavior), just activate
                // Note: The limit order was already placed on Hyperliquid when the signal was created
                // This just updates our tracking status to "active" (filled)
                if (content.formatted_tweet) {
                     logger.info(`Pending signal ${run.id} already published. Activating...`);
                     content.status = 'active';
                     logger.info(`Limit order filled at ${currentPrice} (Target was ${entryPrice})`);
                     await supabaseService.updateRun(run.id, { content });
                     continue;
                }

                // 1. Generate Content
                try {
                    logger.info('Generating content for triggered signal...');
                    const { runner: generator } = await GeneratorAgent.build();
                    const generatorPrompt = `Generate content for this signal that just TRIGGERED (Limit order filled): ${JSON.stringify({
                        token: content.token,
                        details: { ...content, entry_price: currentPrice } // Use actual fill price? Or original? Use original for consistency.
                    })}`;

                    const generatorResult = await generator.ask(generatorPrompt) as unknown as GeneratorResult;
                    
                    // Clean content to remove errant backslashes from tweet formats
                    content.formatted_tweet = cleanSignalText(generatorResult.formatted_content);
                    content.status = 'active';
                    // Keep original entry_price for R:R calculation, log actual fill
                    logger.info(`Limit order filled at ${currentPrice} (Target was ${entryPrice})`);
                    
                    // 2. Publish
                    // Immediate: Gold/Diamond
                    logger.info(`Distributing Triggered Signal to GOLD/DIAMOND...`);
                    await telegramService.broadcastToTiers(generatorResult.formatted_content, [TIERS.GOLD, TIERS.DIAMOND]);

                    // Delayed 15-20m: Silver (DB-backed)
                    await scheduledPostService.schedulePost(run.id, 'SILVER', generatorResult.formatted_content)
                        .catch(err => logger.error('Error scheduling SILVER post', err));

                    // Delayed 60-90m: Public (Twitter, DB-backed) - randomized to avoid spam detection
                    await scheduledPostService.schedulePost(run.id, 'PUBLIC', generatorResult.formatted_content)
                        .catch(err => logger.error('Error scheduling PUBLIC post', err));

                    // Update Run in DB
                    await supabaseService.updateRun(run.id, { 
                        content,
                        telegram_delivered_at: new Date().toISOString()
                    });
                    
                    // Note: The limit order was already placed on Hyperliquid when the signal was created
                    // This just updates our tracking status to "active" (filled)
                    
                    continue; // Move to next signal, don't process PnL yet for this tick

                } catch (genError) {
                    logger.error(`Error generating/publishing triggered signal ${run.id}`, genError);
                    // Mark as failed to prevent infinite retries
                    content.status = 'closed';
                    await supabaseService.updateRun(run.id, { 
                        content,
                        error_message: `Failed to publish pending signal: ${genError}`
                    });
                    continue;
                }
            } else {
                logger.info(`Pending signal ${content.token.symbol} not triggered. Current: ${currentPrice}, Target: ${entryPrice}`);
                continue;
            }
        }

        // If status is undefined, set it to active
        if (!content.status) {
          content.status = 'active';
        }

        // Fixed 1% risk per trade model
        // Risk = entry_price - stop_loss
        // Reward = target_price - entry_price
        // R:R ratio = reward / risk
        // On SL hit: -1% (fixed loss)
        // On TP hit: +1% × R:R ratio
        // While active: show current R multiple (how many R's we're up/down)
        const RISK_PER_TRADE = 1; // 1% risk per trade
        const entryPrice = content.entry_price;
        const risk = entryPrice - content.stop_loss; // Risk in price terms
        const reward = content.target_price - entryPrice; // Reward in price terms
        const rrRatio = risk > 0 ? reward / risk : 1; // Risk:Reward ratio
        
        content.current_price = currentPrice;

        // Check TP/SL first to determine final PnL
        let statusChanged = false;
        
        // Assuming Long position logic
        if (currentPrice >= content.target_price) {
            content.status = 'tp_hit';
            content.closed_at = new Date().toISOString();
            // TP hit: gain = 1% × R:R ratio
            content.pnl_percent = RISK_PER_TRADE * rrRatio;
            statusChanged = true;
            logger.info(`Signal ${run.id} hit TP! PnL: +${content.pnl_percent.toFixed(2)}% (R:R ${rrRatio.toFixed(2)})`);
        } else if (currentPrice <= content.stop_loss) {
            content.status = 'sl_hit';
            content.closed_at = new Date().toISOString();
            // SL hit: fixed -1% loss
            content.pnl_percent = -RISK_PER_TRADE;
            statusChanged = true;
            logger.info(`Signal ${run.id} hit SL! PnL: ${content.pnl_percent.toFixed(2)}%`);
        } else {
            // Still active: calculate current R multiple
            // Current R = (currentPrice - entryPrice) / risk
            const currentR = risk > 0 ? (currentPrice - entryPrice) / risk : 0;
            content.pnl_percent = currentR * RISK_PER_TRADE;
            statusChanged = true; // Update anyway to show live price/pnl
        }

        if (statusChanged) {
            await supabaseService.updateRun(run.id, { content });
            logger.info(`Updated signal ${run.id} status to ${content.status}, PnL: ${content.pnl_percent.toFixed(2)}%`);
        }
    }
  }
}

export const signalMonitorService = new SignalMonitorService();
