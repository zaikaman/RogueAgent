import { supabaseService } from './supabase.service';
import { birdeyeService } from './birdeye.service';
import { coingeckoService } from './coingecko.service';
import { logger } from '../utils/logger.util';
import { SignalContent } from '../../shared/types/signal.types';

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

        logger.info(`Tracking active signal: ${run.id} (${content.token.symbol})`);

        // If status is undefined, set it to active
        if (!content.status) {
          content.status = 'active';
        }

        // Get current price
        let currentPrice: number | null = null;
        
        try {
            // Try Birdeye first if address exists (preferred for Solana/DEX tokens)
            if (content.token.contract_address) {
                const overview = await birdeyeService.getTokenOverview(content.token.contract_address);
                if (overview && overview.price) {
                    currentPrice = overview.price;
                }
            }

            // Fallback to CoinGecko if no price yet and we have an ID
            if (!currentPrice && (content.token as any).coingecko_id) {
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
