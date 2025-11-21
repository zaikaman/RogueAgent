import { supabaseService } from './supabase.service';
import { birdeyeService } from './birdeye.service';
import { coingeckoService } from './coingecko.service';
import { logger } from '../utils/logger.util';
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

    for (const run of runs) {
        const content = run.content as SignalContent;

        // If already closed, skip
        if (content.status === 'tp_hit' || content.status === 'sl_hit' || content.status === 'closed') {
          continue;
        }

        logger.info(`Tracking signal: ${run.id} (${content.token.symbol}) Status: ${content.status || 'active'}`);

        // Get current price
        let currentPrice: number | null = null;
        
        try {
            // Use CoinGecko for price if we have an ID
            if ((content.token as any).coingecko_id) {
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
                
                // 1. Generate Content
                try {
                    logger.info('Generating content for triggered signal...');
                    const { runner: generator } = await GeneratorAgent.build();
                    const generatorPrompt = `Generate content for this signal that just TRIGGERED (Limit order filled): ${JSON.stringify({
                        token: content.token,
                        details: { ...content, entry_price: currentPrice } // Use actual fill price? Or original? Use original for consistency.
                    })}`;

                    const generatorResult = await generator.ask(generatorPrompt) as unknown as GeneratorResult;
                    
                    content.formatted_tweet = generatorResult.formatted_content;
                    content.status = 'active';
                    // Keep original entry_price for R:R calculation, log actual fill
                    logger.info(`Limit order filled at ${currentPrice} (Target was ${entryPrice})`);
                    
                    // 2. Publish
                    // Immediate: Gold/Diamond
                    logger.info(`Distributing Triggered Signal to GOLD/DIAMOND...`);
                    await telegramService.broadcastToTiers(generatorResult.formatted_content, [TIERS.GOLD, TIERS.DIAMOND]);

                    // Delayed 15m: Silver (DB-backed)
                    await scheduledPostService.schedulePost(run.id, 'SILVER', generatorResult.formatted_content, 15)
                        .catch(err => logger.error('Error scheduling SILVER post', err));

                    // Delayed 30m: Public (Twitter, DB-backed)
                    await scheduledPostService.schedulePost(run.id, 'PUBLIC', generatorResult.formatted_content, 30)
                        .catch(err => logger.error('Error scheduling PUBLIC post', err));

                    // Update Run in DB
                    await supabaseService.updateRun(run.id, { 
                        content,
                        telegram_delivered_at: new Date().toISOString()
                    });
                    
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

        // Calculate PnL
        const entryPrice = content.entry_price;
        const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        
        content.current_price = currentPrice;
        content.pnl_percent = pnlPercent;

        // Check TP/SL
        let statusChanged = false;
        
        // Assuming Long position logic
        if (currentPrice >= content.target_price) {
            content.status = 'tp_hit';
            content.closed_at = new Date().toISOString();
            statusChanged = true;
            logger.info(`Signal ${run.id} hit TP!`);
        } else if (currentPrice <= content.stop_loss) {
            content.status = 'sl_hit';
            content.closed_at = new Date().toISOString();
            statusChanged = true;
            logger.info(`Signal ${run.id} hit SL!`);
        } else {
            // Still active, but we updated price/pnl
            statusChanged = true; // Update anyway to show live price/pnl
        }

        if (statusChanged) {
            await supabaseService.updateRun(run.id, { content });
            logger.info(`Updated signal ${run.id} status to ${content.status}, PnL: ${pnlPercent.toFixed(2)}%`);
        }
    }
  }
}

export const signalMonitorService = new SignalMonitorService();
