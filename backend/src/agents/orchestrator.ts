import { ScannerAgent } from './scanner.agent';
import { AnalyzerAgent } from './analyzer.agent';
import { GeneratorAgent } from './generator.agent';
import { PublisherAgent } from './publisher.agent';
import { logger } from '../utils/logger.util';
import { supabaseService } from '../services/supabase.service';
import { randomUUID } from 'crypto';
import { twitterService } from '../services/twitter.service';
import { telegramService } from '../services/telegram.service';
import { coingeckoService } from '../services/coingecko.service';
import { birdeyeService } from '../services/birdeye.service';

interface ScannerResult {
  candidates: Array<{
    symbol: string;
    name: string;
    coingecko_id?: string;
    reason: string;
  }>;
}

interface AnalyzerResult {
  selected_token: {
    symbol: string;
    name: string;
    coingecko_id: string;
  } | null;
  signal_details: {
    entry_price: number;
    target_price: number;
    stop_loss: number;
    confidence: number;
    analysis: string;
    trigger_event: {
      type: string;
      description: string;
    };
  } | null;
  action: 'signal' | 'skip';
}

interface GeneratorResult {
  formatted_content: string;
}

interface PublisherResult {
  twitter_post_id: string | null;
  telegram_sent?: boolean;
  status: 'posted' | 'failed' | 'skipped';
}

export class Orchestrator {
  async runSwarm() {
    const runId = randomUUID();
    const startTime = Date.now();
    logger.info(`Starting swarm run ${runId}`);

    try {
      // 1. Scanner
      logger.info('Running Scanner Agent...');

      // Fetch data manually to avoid tool calling issues with custom LLM
      logger.info('Fetching market data for Scanner...');
      const [trendingCg, trendingBe, topGainers] = await Promise.all([
        coingeckoService.getTrending().catch(e => { logger.error('CG Trending Error', e); return []; }),
        birdeyeService.getTrendingTokens(10).catch(e => { logger.error('Birdeye Trending Error', e); return []; }),
        coingeckoService.getTopGainersLosers().catch(e => { logger.error('CG Gainers Error', e); return []; })
      ]);

      const marketData = {
        trending_coingecko: trendingCg.map((c: any) => ({
          name: c.item.name,
          symbol: c.item.symbol,
          rank: c.item.market_cap_rank
        })),
        trending_birdeye: trendingBe.map((c: any) => ({
          name: c.name,
          symbol: c.symbol,
          rank: c.rank,
          volume24h: c.volume24hUSD
        })),
        top_gainers: topGainers.slice(0, 15).map((c: any) => ({
          name: c.name,
          symbol: c.symbol,
          change_24h: c.price_change_percentage_24h
        }))
      };

      const { runner: scanner } = await ScannerAgent.build();
      const scannerPrompt = `Scan the market for top trending tokens. Here is the current market data:\n${JSON.stringify(marketData, null, 2)}`;
      
      const scannerResult = await scanner.ask(scannerPrompt) as unknown as ScannerResult;
      
      logger.info('Scanner result:', scannerResult);

      if (!scannerResult.candidates || scannerResult.candidates.length === 0) {
        logger.info('No candidates found. Skipping run.');
        await this.saveRun(runId, 'skip', {}, startTime);
        return;
      }

      const isSunday = new Date().getDay() === 0;

      // 2. Analyzer
      logger.info('Running Analyzer Agent...');
      const { runner: analyzer } = await AnalyzerAgent.build();
      const analyzerPrompt = isSunday 
        ? `Analyze these candidates for a Sunday Deep Dive Report. Focus on weekly trends and major catalysts: ${JSON.stringify(scannerResult.candidates)}`
        : `Analyze these candidates: ${JSON.stringify(scannerResult.candidates)}`;
      
      const analyzerResult = await analyzer.ask(analyzerPrompt) as unknown as AnalyzerResult;

      logger.info('Analyzer result:', analyzerResult);

      if (analyzerResult.action === 'skip' || !analyzerResult.selected_token || !analyzerResult.signal_details) {
        logger.info('Analyzer decided to skip.');
        await this.saveRun(runId, 'skip', {}, startTime);
        return;
      }

      // 3. Generator
      logger.info('Running Generator Agent...');
      const { runner: generator } = await GeneratorAgent.build();
      const generatorPrompt = isSunday
        ? `Generate a Sunday Deep Dive Report for this signal. Be extensive and detailed: ${JSON.stringify({
          token: analyzerResult.selected_token,
          details: analyzerResult.signal_details
        })}`
        : `Generate content for this signal: ${JSON.stringify({
          token: analyzerResult.selected_token,
          details: analyzerResult.signal_details
        })}`;

      const generatorResult = await generator.ask(generatorPrompt) as unknown as GeneratorResult;

      logger.info('Generator result:', generatorResult);

      // 4. Publisher (Twitter check)
      logger.info('Running Publisher Agent (Twitter check)...');
      
      // 5. Save Result
      const signalContent = {
        token: analyzerResult.selected_token,
        ...analyzerResult.signal_details,
        formatted_tweet: generatorResult.formatted_content,
      };

      // Post to Twitter immediately
      logger.info(`Posting to Twitter for run ${runId}...`);
      let publicPostedAt = null;
      try {
        const tweetId = await twitterService.postTweet(generatorResult.formatted_content);
        
        if (tweetId) {
          logger.info(`Twitter post successful: ${tweetId}`);
          publicPostedAt = new Date().toISOString();
        } else {
          logger.warn(`Twitter post failed for run ${runId}. Check API keys and cookies.`);
        }
      } catch (error) {
        logger.error(`Error in Twitter post for run ${runId}`, error);
      }

      await this.saveRun(
        runId, 
        'signal', 
        signalContent, 
        startTime, 
        analyzerResult.signal_details.confidence,
        undefined,
        publicPostedAt,
        null
      );
      
      logger.info('Run completed successfully.');

    } catch (error: any) {
      logger.error('Swarm run failed:', error);
      await this.saveRun(runId, 'skip', { error: error.message }, startTime, null, error.message);
    }
  }

  async processCustomRequest(requestId: string, tokenSymbol: string, walletAddress: string) {
    logger.info(`Processing custom request ${requestId} for ${tokenSymbol}`);
    
    try {
      // Update status to processing
      await supabaseService.updateCustomRequest(requestId, { status: 'processing' });

      // 1. Scanner (Targeted)
      logger.info('Running Scanner Agent for custom request...');
      const { runner: scanner } = await ScannerAgent.build();
      const scannerResult = await scanner.ask(`Get market data and news for ${tokenSymbol}.`) as unknown as ScannerResult;
      
      // 2. Analyzer
      logger.info('Running Analyzer Agent for custom request...');
      const { runner: analyzer } = await AnalyzerAgent.build();
      const analyzerResult = await analyzer.ask(
        `Analyze this token for a custom report: ${JSON.stringify(scannerResult)}`
      ) as unknown as AnalyzerResult;

      // 3. Generator
      logger.info('Running Generator Agent for custom request...');
      const { runner: generator } = await GeneratorAgent.build();
      const generatorResult = await generator.ask(
        `Generate a custom analysis report for ${tokenSymbol}: ${JSON.stringify(analyzerResult)}`
      ) as unknown as GeneratorResult;

      // 4. Deliver via Telegram DM
      const user = await supabaseService.getUser(walletAddress);
      if (user && user.telegram_user_id) {
        await telegramService.sendMessage(
          `**Custom Analysis for ${tokenSymbol}**\n\n${generatorResult.formatted_content}`,
          user.telegram_user_id.toString()
        );
        
        await supabaseService.updateCustomRequest(requestId, { 
          status: 'completed',
          analysis_result: generatorResult,
          delivered_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        });
      } else {
        logger.warn(`User ${walletAddress} has no Telegram ID linked. Cannot deliver.`);
        await supabaseService.updateCustomRequest(requestId, { 
          status: 'completed',
          error_message: 'User has no Telegram ID linked',
          completed_at: new Date().toISOString()
        });
      }

    } catch (error: any) {
      logger.error(`Custom request processing failed for ${requestId}`, error);
      await supabaseService.updateCustomRequest(requestId, { 
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      });
    }
  }

  private async saveRun(
    id: string, 
    type: 'signal' | 'intel' | 'skip', 
    content: any, 
    startTime: number,
    confidence?: number | null,
    errorMessage?: string,
    publicPostedAt?: string | null,
    telegramDeliveredAt?: string | null
  ) {
    const endTime = Date.now();
    await supabaseService.createRun({
      id,
      type,
      content,
      cycle_started_at: new Date(startTime).toISOString(),
      cycle_completed_at: new Date(endTime).toISOString(),
      execution_time_ms: endTime - startTime,
      confidence_score: confidence,
      error_message: errorMessage,
      public_posted_at: publicPostedAt,
      telegram_delivered_at: telegramDeliveredAt,
    });
  }
}

export const orchestrator = new Orchestrator();
