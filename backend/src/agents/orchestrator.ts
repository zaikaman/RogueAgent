import { ScannerAgent } from './scanner.agent';
import { AnalyzerAgent } from './analyzer.agent';
import { GeneratorAgent } from './generator.agent';
import { IntelAgent } from './intel.agent';
import { logger } from '../utils/logger.util';
import { supabaseService } from '../services/supabase.service';
import { randomUUID } from 'crypto';
import { twitterService } from '../services/twitter.service';
import { telegramService } from '../services/telegram.service';
import { coingeckoService } from '../services/coingecko.service';
import { birdeyeService } from '../services/birdeye.service';
import { defillamaService } from '../services/defillama.service';
import { runwareService } from '../services/runware.service';
import { TIERS } from '../constants/tiers';

interface ScannerResult {
  candidates?: Array<{
    symbol: string;
    name: string;
    coingecko_id?: string;
    reason: string;
  }>;
  analysis?: {
    symbol: string;
    name: string;
    current_price_usd?: number;
    market_cap?: number;
    volume_24h?: number;
    price_action?: any;
    top_narratives?: string[];
    on_chain_anomalies?: any;
    price_driver_summary?: string;
  };
}

interface AnalyzerResult {
  selected_token: {
    symbol: string;
    name: string;
    coingecko_id: string;
  } | null;
  signal_details: {
    entry_price: number | null;
    target_price: number | null;
    stop_loss: number | null;
    confidence: number;
    analysis: string;
    trigger_event: {
      type: string;
      description: string;
    };
  } | null;
  analysis_summary: string;
  action: 'signal' | 'skip' | 'no_signal';
}

interface GeneratorResult {
  formatted_content: string;
  tweet_text?: string;
  blog_post?: string;
  image_prompt?: string;
  log_message?: string;
}

interface PublisherResult {
  twitter_post_id: string | null;
  telegram_sent?: boolean;
  status: 'posted' | 'failed' | 'skipped';
}

interface IntelResult {
  topic: string;
  insight: string;
}

export class Orchestrator {
  async runSwarm() {
    const runId = randomUUID();
    const startTime = Date.now();
    logger.info(`Starting swarm run ${runId}`);

    try {
      // Fetch data manually to avoid tool calling issues with custom LLM
      logger.info('Fetching market data...');
      const [trendingCg, trendingBe, topGainers, defiChains, defiProtocols] = await Promise.all([
        coingeckoService.getTrending().catch(e => { logger.error('CG Trending Error', e); return []; }),
        birdeyeService.getTrendingTokens(10).catch(e => { logger.error('Birdeye Trending Error', e); return []; }),
        coingeckoService.getTopGainersLosers().catch(e => { logger.error('CG Gainers Error', e); return []; }),
        defillamaService.getGlobalTVL().catch(e => { logger.error('DeFi Llama Chains Error', e); return []; }),
        defillamaService.getProtocolStats().catch(e => { logger.error('DeFi Llama Protocols Error', e); return []; })
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
        })),
        defi_tvl_top_chains: defiChains,
        defi_top_growing_protocols: defiProtocols
      };

      // Check signal quota
      const recentSignals = await supabaseService.getRecentSignalCount(24);
      const shouldTrySignal = recentSignals < 3;
      logger.info(`Recent signals (24h): ${recentSignals}. Should try signal: ${shouldTrySignal}`);

      let signalGenerated = false;
      let analyzerResult: AnalyzerResult | null = null;

      if (shouldTrySignal) {
        // 1. Scanner
        logger.info('Running Scanner Agent...');
        const { runner: scanner } = await ScannerAgent.build();
        const scannerPrompt = `Scan the market for top trending tokens. Here is the current market data:\n${JSON.stringify(marketData, null, 2)}`;
        
        const scannerResult = await scanner.ask(scannerPrompt) as unknown as ScannerResult;
        logger.info('Scanner result:', scannerResult);

        if (scannerResult.candidates && scannerResult.candidates.length > 0) {
          // 2. Analyzer
          logger.info('Running Analyzer Agent...');
          const { runner: analyzer } = await AnalyzerAgent.build();
          const analyzerPrompt = `Analyze these candidates: ${JSON.stringify(scannerResult.candidates)}`;
          
          analyzerResult = await analyzer.ask(analyzerPrompt) as unknown as AnalyzerResult;
          logger.info('Analyzer result:', analyzerResult);

          if (analyzerResult.action === 'signal' && analyzerResult.selected_token && analyzerResult.signal_details) {
            signalGenerated = true;
          } else {
            logger.info('Analyzer decided to skip signal generation.');
          }
        } else {
          logger.info('No candidates found by Scanner.');
        }
      }

      if (signalGenerated && analyzerResult && analyzerResult.signal_details) {
        // 3. Generator (Signal)
        logger.info('Running Generator Agent (Signal)...');
        const { runner: generator } = await GeneratorAgent.build();
        const generatorPrompt = `Generate content for this signal: ${JSON.stringify({
          token: analyzerResult.selected_token,
          details: analyzerResult.signal_details
        })}`;

        const generatorResult = await generator.ask(generatorPrompt) as unknown as GeneratorResult;
        logger.info('Generator result:', generatorResult);

        // 4. Publisher (Tiered)
        const signalContent = {
          token: analyzerResult.selected_token,
          ...analyzerResult.signal_details,
          formatted_tweet: generatorResult.formatted_content,
          log_message: generatorResult.log_message,
        };

        // Immediate: Gold/Diamond
        logger.info(`Distributing Signal to GOLD/DIAMOND for run ${runId}...`);
        telegramService.broadcastToTiers(generatorResult.formatted_content, [TIERS.GOLD, TIERS.DIAMOND])
          .catch(err => logger.error('Error broadcasting to GOLD/DIAMOND', err));

        // Delayed 15m: Silver
        logger.info(`Scheduling Signal for SILVER (+15m) for run ${runId}...`);
        setTimeout(() => {
          telegramService.broadcastToTiers(generatorResult.formatted_content, [TIERS.SILVER])
            .catch(err => logger.error('Error broadcasting to SILVER', err));
        }, 15 * 60 * 1000);

        // Delayed 30m: Public (Twitter)
        logger.info(`Scheduling Signal for PUBLIC (+30m) for run ${runId}...`);
        setTimeout(async () => {
          try {
            const tweetId = await twitterService.postTweet(generatorResult.formatted_content);
            if (tweetId) {
              logger.info(`Twitter post successful: ${tweetId}`);
              await supabaseService.updateRun(runId, { public_posted_at: new Date().toISOString() });
            }
          } catch (error) {
            logger.error(`Error in Twitter post for run ${runId}`, error);
          }
        }, 30 * 60 * 1000);

        await this.saveRun(
          runId, 
          'signal', 
          signalContent, 
          startTime, 
          analyzerResult.signal_details.confidence,
          undefined,
          null, // publicPostedAt is now delayed
          new Date().toISOString() // telegramDeliveredAt (immediate for Gold/Diamond)
        );

      } else {
        // Fallback to Intel
        logger.info('Running Intel Flow...');
        
        // Fetch recent topics to avoid repetition
        const recentTopics = await supabaseService.getRecentIntelTopics(5);
        logger.info('Recent Intel Topics:', recentTopics);
        
        // 1. Intel Agent
        const { runner: intelAgent } = await IntelAgent.build();
        const isSunday = new Date().getDay() === 0;
        let intelPrompt = `Analyze this market data and generate an intel report: ${JSON.stringify(marketData, null, 2)}
        
        AVOID these recently covered topics: ${recentTopics.join(', ')}`;

        if (isSunday) {
            intelPrompt += `\n\nIMPORTANT: It is Sunday. Generate a "Deep Dive" report focusing on the week's sharpest mindshare divergences and KOL narratives. This will be exclusive to high-tier users.`;
        }
        
        const intelResult = await intelAgent.ask(intelPrompt) as unknown as IntelResult;
        logger.info('Intel result:', intelResult);

        // 2. Generator (Intel)
        logger.info('Running Generator Agent (Intel)...');
        const { runner: generator } = await GeneratorAgent.build();
        const generatorPrompt = `Generate content for this INTEL REPORT.
        
        I need both a 'tweet_text' (short, lowercase, alpha vibe) and a 'blog_post' (full markdown analysis).
        
        Report: ${JSON.stringify(intelResult)}`;
        
        const generatorResult = await generator.ask(generatorPrompt) as unknown as GeneratorResult;
        logger.info('Generator result:', generatorResult);

        // 2.5 Image Generation
        let imageUrl: string | null = null;
        if (generatorResult.image_prompt) {
          logger.info('Generating image for intel...');
          imageUrl = await runwareService.generateImage(generatorResult.image_prompt);
        }

        // 3. Publisher (Tiered)
        logger.info(`Publishing Intel for run ${runId}...`);
        const tweetContent = generatorResult.tweet_text || generatorResult.formatted_content;
        const blogContent = generatorResult.blog_post || generatorResult.formatted_content;
        
        // Immediate: Gold/Diamond (Blog Post)
        if (blogContent) {
           logger.info(`Distributing Intel Blog to GOLD/DIAMOND for run ${runId}...`);
           telegramService.broadcastToTiers(blogContent, [TIERS.GOLD, TIERS.DIAMOND])
             .catch(err => logger.error('Error distributing to GOLD/DIAMOND', err));
        }

        // Delayed 15m: Silver (Blog Post) - SKIP if Sunday Deep Dive
        if (blogContent && !isSunday) {
           logger.info(`Scheduling Intel Blog for SILVER (+15m) for run ${runId}...`);
           setTimeout(() => {
             telegramService.broadcastToTiers(blogContent, [TIERS.SILVER])
               .catch(err => logger.error('Error distributing to SILVER', err));
           }, 15 * 60 * 1000);
        }

        // Delayed 30m: Public (Twitter) - SKIP if Sunday Deep Dive
        if (tweetContent && !isSunday) {
           logger.info(`Scheduling Intel Tweet for PUBLIC (+30m) for run ${runId}...`);
           setTimeout(async () => {
             try {
               const tweetId = await twitterService.postTweet(tweetContent);
               if (tweetId) {
                 logger.info(`Twitter post successful: ${tweetId}`);
                 await supabaseService.updateRun(runId, { public_posted_at: new Date().toISOString() });
               }
             } catch (error) {
               logger.error(`Error in Twitter post for run ${runId}`, error);
             }
           }, 30 * 60 * 1000);
        }

        await this.saveRun(
          runId, 
          'intel', 
          { 
            ...intelResult, 
            tweet_text: tweetContent,
            blog_post: generatorResult.blog_post,
            image_prompt: generatorResult.image_prompt,
            image_url: imageUrl,
            formatted_tweet: tweetContent, // Keep for backward compat
            log_message: generatorResult.log_message,
          }, 
          startTime, 
          null,
          undefined,
          null, // publicPostedAt is delayed
          new Date().toISOString() // telegramDeliveredAt (immediate for Gold/Diamond)
        );
      }
      
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
      const scannerResult = await scanner.ask(
        `Perform a deep-dive scan on ${tokenSymbol}. I need:
        1. Current Price, Market Cap, and 24h Volume.
        2. Recent price action (1h, 24h, 7d).
        3. Top 3 recent news headlines or social narratives driving the price.
        4. Any on-chain anomalies (whale movements, TVL changes) if available.
        Focus on finding the 'why' behind the current price action.`
      ) as unknown as ScannerResult;
      
      // 2. Analyzer
      logger.info('Running Analyzer Agent for custom request...');
      const { runner: analyzer } = await AnalyzerAgent.build();
      const analyzerResult = await analyzer.ask(
        `Analyze this data for a high-stakes trader.
        Data: ${JSON.stringify(scannerResult)}

        I need a 'Custom Alpha Report' that answers:
        1. Is this token currently overbought or oversold?
        2. What is the primary narrative driving it right now?
        3. What are the key support/resistance levels to watch?
        4. VERDICT: Bullish, Bearish, or Neutral? Give a confidence score (0-100%).`
      ) as unknown as AnalyzerResult;

      // 3. Generator
      logger.info('Running Generator Agent for custom request...');
      const { runner: generator } = await GeneratorAgent.build();
      const generatorResult = await generator.ask(
        `Generate a 'Rogue Agent Custom Report' for ${tokenSymbol} based on this analysis.
        Analysis: ${JSON.stringify(analyzerResult)}

        Format:
        - Use Markdown.
        - Start with a bold header: '🕵️‍♂️ ROGUE CUSTOM SCAN: ${tokenSymbol}'.
        - Include sections: 'Market Snapshot', 'Narrative Check', 'Technical Outlook', and 'The Verdict'.
        - Tone: Professional, sharp, no-nonsense, 'alpha' focused.
        - Keep it under 400 words.
        
        IMPORTANT: Put the entire report in the 'formatted_content' field of the JSON output.`
      ) as unknown as GeneratorResult;

      // 4. Deliver via Telegram DM
      const user = await supabaseService.getUser(walletAddress);
      if (user && user.telegram_user_id) {
        const content = generatorResult.formatted_content || generatorResult.blog_post || "Analysis generation failed.";
        await telegramService.sendMessage(
          `**Custom Analysis for ${tokenSymbol}**\n\n${content}`,
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
