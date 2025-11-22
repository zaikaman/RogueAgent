import { ScannerAgent } from './scanner.agent';
import { AnalyzerAgent } from './analyzer.agent';
import { GeneratorAgent } from './generator.agent';
import { IntelAgent } from './intel.agent';
import { YieldAgent } from './yield.agent';
import { logger } from '../utils/logger.util';
import { supabaseService } from '../services/supabase.service';
import { randomUUID } from 'crypto';
import { twitterService } from '../services/twitter.service';
import { telegramService } from '../services/telegram.service';
import { coingeckoService } from '../services/coingecko.service';
import { coinMarketCapService } from '../services/coinmarketcap.service';
import { birdeyeService } from '../services/birdeye.service';
import { defillamaService } from '../services/defillama.service';
import { runwareService } from '../services/runware.service';
import { TIERS } from '../constants/tiers';
import { scheduledPostService } from '../services/scheduled-post.service';

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
  action: 'signal' | 'skip' | 'no_signal';
  analysis_summary: string;
  selected_token: {
    symbol: string;
    name: string;
    coingecko_id?: string;
    chain?: string;
    address?: string | null;
  } | null;
  signal_details: {
    order_type?: 'market' | 'limit';
    entry_price: number | null;
    target_price: number | null;
    stop_loss: number | null;
    confidence: number;
    analysis: string;
    trigger_event: {
      type: string;
      description: string;
    } | null;
  } | null;
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
  importance_score: number;
}

export class Orchestrator {
  async runSwarm() {
    const runId = randomUUID();
    const startTime = Date.now();
    logger.info(`Starting swarm run ${runId}`);

    try {
      // Fetch data manually to avoid tool calling issues with custom LLM
      logger.info('Fetching market data...');
      const [trendingCg, trendingBe, topGainers, defiChains, defiProtocols, bitcoinData] = await Promise.all([
        coingeckoService.getTrending().catch(e => { logger.error('CG Trending Error', e); return []; }),
        birdeyeService.getTrendingTokens(10).catch(e => { logger.error('Birdeye Trending Error', e); return []; }),
        coingeckoService.getTopGainersLosers().catch(e => { logger.error('CG Gainers Error', e); return []; }),
        defillamaService.getGlobalTVL().catch(e => { logger.error('DeFi Llama Chains Error', e); return []; }),
        defillamaService.getProtocolStats().catch(e => { logger.error('DeFi Llama Protocols Error', e); return []; }),
        (async () => {
            try {
                const price = await coinMarketCapService.getPriceWithChange('BTC');
                if (price) return price;
                throw new Error('CMC returned null');
            } catch (e) {
                logger.warn('CMC BTC Price Error, falling back to CG');
                return coingeckoService.getPriceWithChange('bitcoin').catch(e2 => { logger.error('CG BTC Price Error', e2); return null; });
            }
        })()
      ]);

      const marketData = {
        global_market_context: {
          bitcoin: bitcoinData
        },
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

      // Check signal quota (only counts published signals, not pending)
      const recentSignals = await supabaseService.getRecentSignalCount(24);
      const shouldTrySignal = recentSignals < 3;
      logger.info(`Recent published signals (24h): ${recentSignals}. Should try signal: ${shouldTrySignal}`);

      // Fetch recent posts history to avoid repetition
      const recentPosts = await supabaseService.getRecentPosts(10);

      let signalGenerated = false;
      let analyzerResult: AnalyzerResult | null = null;

      if (shouldTrySignal) {
        // 1. Scanner
        logger.info('Running Scanner Agent...');
        const { runner: scanner } = await ScannerAgent.build();
        const scannerPrompt = `Scan the market for top trending tokens. Here is the current market data:\n${JSON.stringify(marketData, null, 2)}
        
        RECENTLY POSTED CONTENT (Avoid repeating these):
        ${JSON.stringify(recentPosts)}`;
        
        const scannerResult = await this.runAgentWithRetry<ScannerResult>(
          scanner,
          scannerPrompt,
          'Scanner Agent'
        );
        logger.info('Scanner result:', scannerResult);

        if (scannerResult.candidates && scannerResult.candidates.length > 0) {
          // 2. Analyzer
          logger.info('Running Analyzer Agent...');
          const { runner: analyzer } = await AnalyzerAgent.build();
          const analyzerPrompt = `Analyze these candidates: ${JSON.stringify(scannerResult.candidates)}
          
          Global Market Context: ${JSON.stringify(marketData.global_market_context)}`;
          
          analyzerResult = await this.runAgentWithRetry<AnalyzerResult>(
            analyzer,
            analyzerPrompt,
            'Analyzer Agent'
          );
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
        const isLimitOrder = analyzerResult.signal_details.order_type === 'limit';
        
        if (isLimitOrder) {
            // Validate required fields for pending signals
            if (!analyzerResult.selected_token?.coingecko_id) {
                logger.error('Cannot create pending signal: missing coingecko_id for price monitoring');
                return;
            }
            if (!analyzerResult.signal_details.entry_price) {
                logger.error('Cannot create pending signal: missing entry_price');
                return;
            }
            
            logger.info(`Limit Order detected for ${analyzerResult.selected_token?.symbol}. Processing as PENDING signal.`);
        }

        // 3. Generator (Signal)
        logger.info('Running Generator Agent (Signal)...');
        const { runner: generator } = await GeneratorAgent.build();
        const generatorPrompt = `Generate content for this signal: ${JSON.stringify({
          token: analyzerResult.selected_token,
          details: analyzerResult.signal_details
        })}`;

        const generatorResult = await this.runAgentWithRetry<GeneratorResult>(
          generator,
          generatorPrompt,
          'Generator Agent (Signal)'
        );
        logger.info('Generator result:', generatorResult);

        const content = generatorResult.formatted_content || generatorResult.tweet_text;

        if (!content) {
            logger.error('Generator failed to produce content', generatorResult);
            await this.saveRun(
                runId,
                'signal',
                { error: 'Generator failed to produce content', generatorResult },
                startTime,
                analyzerResult.signal_details.confidence,
                'Generator failed to produce content'
            );
            return;
        }

        // 4. Publisher (Tiered)
        const signalContent = {
          token: analyzerResult.selected_token,
          ...analyzerResult.signal_details,
          formatted_tweet: content,
          log_message: generatorResult.log_message,
          status: isLimitOrder ? 'pending' : 'active',
        };

        // Save run first to ensure ID exists for scheduled posts
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

        // Immediate: Gold/Diamond
        logger.info(`Distributing Signal to GOLD/DIAMOND for run ${runId}...`);
        telegramService.broadcastToTiers(content, [TIERS.GOLD, TIERS.DIAMOND])
          .catch(err => logger.error('Error broadcasting to GOLD/DIAMOND', err));

        // Delayed 15m: Silver (DB-backed)
        logger.info(`Scheduling Signal for SILVER (+15m) for run ${runId}...`);
        await scheduledPostService.schedulePost(runId, 'SILVER', content, 15)
          .catch(err => logger.error('Error scheduling SILVER post', err));

        // Delayed 30m: Public (Twitter, DB-backed)
        logger.info(`Scheduling Signal for PUBLIC (+30m) for run ${runId}...`);
        await scheduledPostService.schedulePost(runId, 'PUBLIC', content, 30)
          .catch(err => logger.error('Error scheduling PUBLIC post', err));

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
        
        RECENTLY POSTED CONTENT (Avoid repeating these):
        ${JSON.stringify(recentPosts)}
        
        AVOID these recently covered topics: ${recentTopics.join(', ')}`;

        if (isSunday) {
            intelPrompt += `\n\nIMPORTANT: It is Sunday. Generate a "Deep Dive" report focusing on the week's sharpest mindshare divergences and KOL narratives. This will be exclusive to high-tier users.`;
        }
        
        const intelResult = await this.runAgentWithRetry<IntelResult>(
          intelAgent,
          intelPrompt,
          'Intel Agent'
        );
        logger.info('Intel result:', intelResult);

        if (intelResult.topic === 'SKIP' || intelResult.importance_score < 7) {
            logger.info('Intel Agent decided to SKIP (Low importance or no new topics).');
            await this.saveRun(
                runId,
                'intel',
                { topic: 'SKIPPED', insight: 'Low importance' },
                startTime,
                0,
                undefined,
                null,
                null
            );
            return;
        }

        // 2. Generator (Intel)
        logger.info('Running Generator Agent (Intel)...');
        const { runner: generator } = await GeneratorAgent.build();
        const generatorPrompt = `Generate content for this INTEL REPORT.
        
        I need both a 'tweet_text' (short, lowercase, alpha vibe) and a 'blog_post' (full markdown analysis).
        
        Report: ${JSON.stringify(intelResult)}`;
        
        const generatorResult = await this.runAgentWithRetry<GeneratorResult>(
          generator,
          generatorPrompt,
          'Generator Agent (Intel)'
        );
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
        
        // Save run first to ensure ID exists for scheduled posts
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

        // Immediate: Gold/Diamond (Blog Post)
        if (blogContent) {
           logger.info(`Distributing Intel Blog to GOLD/DIAMOND for run ${runId}...`);
           telegramService.broadcastToTiers(blogContent, [TIERS.GOLD, TIERS.DIAMOND])
             .catch(err => logger.error('Error distributing to GOLD/DIAMOND', err));
        }

        // Delayed 15m: Silver (Blog Post) - SKIP if Sunday Deep Dive
        if (blogContent && !isSunday) {
           logger.info(`Scheduling Intel Blog for SILVER (+15m) for run ${runId}...`);
           await scheduledPostService.schedulePost(runId, 'SILVER', blogContent, 15)
             .catch(err => logger.error('Error scheduling SILVER intel post', err));
        }

        // Delayed 30m: Public (Twitter) - SKIP if Sunday Deep Dive
        if (tweetContent && !isSunday) {
           logger.info(`Scheduling Intel Tweet for PUBLIC (+30m) for run ${runId}...`);
           await scheduledPostService.schedulePost(runId, 'PUBLIC', tweetContent, 30)
             .catch(err => logger.error('Error scheduling PUBLIC intel post', err));
        }
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
      const scannerResult = await this.runAgentWithRetry<ScannerResult>(
        scanner,
        `Perform a deep-dive scan on ${tokenSymbol}. I need:
        1. Current Price, Market Cap, and 24h Volume.
        2. Recent price action (1h, 24h, 7d).
        3. Top 3 recent news headlines or social narratives driving the price.
        4. Any on-chain anomalies (whale movements, TVL changes) if available.
        Focus on finding the 'why' behind the current price action.`,
        'Scanner Agent'
      );
      
      // 2. Analyzer
      logger.info('Running Analyzer Agent for custom request...');
      const { runner: analyzer } = await AnalyzerAgent.build();
      const analyzerResult = await this.runAgentWithRetry<AnalyzerResult>(
        analyzer,
        `Analyze this data for a high-stakes trader.
        Data: ${JSON.stringify(scannerResult)}

        I need a 'Custom Alpha Report' that answers:
        1. Is this token currently overbought or oversold?
        2. What is the primary narrative driving it right now?
        3. What are the key support/resistance levels to watch?
        4. VERDICT: Bullish, Bearish, or Neutral? Give a confidence score (0-100%).
        
        IMPORTANT: You must fit this analysis into the strict output schema.
        - Put the detailed answers to the above questions into the 'analysis' string field.
        - You MUST provide 'entry_price', 'target_price', 'stop_loss' (use best estimates from support/resistance or null if strictly not applicable).
        - You MUST provide 'confidence' (number 1-100).
        - You MUST provide 'action' ('signal', 'skip', or 'no_signal').`,
        'Analyzer Agent'
      );

      // 3. Generator
      logger.info('Running Generator Agent for custom request...');
      const { runner: generator } = await GeneratorAgent.build();
      const generatorResult = await this.runAgentWithRetry<GeneratorResult>(
        generator,
        `Generate a 'Rogue Agent Custom Report' for ${tokenSymbol} based on this analysis.
        Analysis: ${JSON.stringify(analyzerResult)}

        Format:
        - Use Markdown.
        - Start with a bold header: '🕵️‍♂️ ROGUE CUSTOM SCAN: ${tokenSymbol}'.
        - Include sections: 'Market Snapshot', 'Narrative Check', 'Technical Outlook', and 'The Verdict'.
        - Tone: Professional, sharp, no-nonsense, 'alpha' focused.
        - Keep it under 400 words.
        
        IMPORTANT: Put the entire report in the 'formatted_content' field of the JSON output.`,
        'Generator Agent'
      );

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

  async runYieldAnalysis() {
    const runId = randomUUID();
    logger.info(`Starting Yield Analysis run ${runId}`);

    try {
      const { runner } = await YieldAgent.build();
      const result = await runner.ask("Find the best yield farming opportunities.") as any;

      if (result.opportunities && result.opportunities.length > 0) {
        logger.info(`Found ${result.opportunities.length} yield opportunities. Saving to DB...`);
        await supabaseService.saveYieldOpportunities(result.opportunities);
      } else {
        logger.info('No yield opportunities found.');
      }
    } catch (error) {
      logger.error('Error in Yield Analysis run', error);
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
    
    // Confidence is now 1-100, no scaling needed
    let finalConfidence = confidence;
    if (typeof confidence === 'number') {
        finalConfidence = Math.max(1, Math.min(100, confidence));
    }

    await supabaseService.createRun({
      id,
      type,
      content,
      cycle_started_at: new Date(startTime).toISOString(),
      cycle_completed_at: new Date(endTime).toISOString(),
      execution_time_ms: endTime - startTime,
      confidence_score: finalConfidence,
      error_message: errorMessage,
      public_posted_at: publicPostedAt,
      telegram_delivered_at: telegramDeliveredAt,
    });
  }

  private async runAgentWithRetry<T>(agentRunner: any, prompt: string, agentName: string): Promise<T> {
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        let currentPrompt = prompt;
        
        if (attempts > 1) {
          // Add error context to help the agent fix the issue
          const errorMessage = lastError?.message || 'Unknown error';
          const isSchemaError = errorMessage.includes('schema') || errorMessage.includes('validation') || errorMessage.includes('parse');
          
          if (isSchemaError) {
            currentPrompt = `${prompt}

⚠️ PREVIOUS ATTEMPT ${attempts - 1} FAILED DUE TO SCHEMA VALIDATION ERROR ⚠️

Error: ${errorMessage}

CRITICAL INSTRUCTIONS TO FIX:
1. You MUST return valid JSON that exactly matches the output schema
2. ALL required fields must be present (especially 'action' field)
3. Field types must match exactly (strings as strings, numbers as numbers, etc.)
4. Enum values must be exactly as specified (e.g., 'signal', 'skip', or 'no_signal')
5. Do NOT include any conversational text - ONLY the JSON object
6. Double-check your JSON syntax is valid

Please retry with correctly formatted output.`;
          } else {
            currentPrompt = `${prompt}

PREVIOUS ATTEMPT FAILED. Error: ${errorMessage}
Please try again and ensure all requirements are met.`;
          }
          
          logger.info(`${agentName} retry attempt ${attempts}/${maxAttempts} with enhanced prompt`);
        }
          
        const result = await agentRunner.ask(currentPrompt) as T;
        
        if (attempts > 1) {
          logger.info(`${agentName} succeeded on attempt ${attempts}/${maxAttempts}`);
        }
        
        return result;
      } catch (error: any) {
        logger.warn(`${agentName} attempt ${attempts}/${maxAttempts} failed:`, {
          message: error.message,
          error: error.toString()
        });
        lastError = error;
        
        if (attempts >= maxAttempts) {
          logger.error(`${agentName} failed after ${maxAttempts} attempts. Last error:`, error);
          throw new Error(`${agentName} failed after ${maxAttempts} retries: ${error.message}`);
        }
        
        // Wait a bit before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        logger.info(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw new Error(`${agentName} failed to produce a result after retries.`);
  }
}

export const orchestrator = new Orchestrator();