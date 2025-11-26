import { ScannerAgent } from './scanner.agent';
import { AnalyzerAgent } from './analyzer.agent';
import { GeneratorAgent } from './generator.agent';
import { WriterAgent } from './writer.agent';
import { IntelAgent } from './intel.agent';
import { YieldAgent } from './yield.agent';
import { AirdropAgent } from './airdrop.agent';
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
import { binanceService } from '../services/binance.service';
import { TIERS } from '../constants/tiers';
import { scheduledPostService } from '../services/scheduled-post.service';
import { EventEmitter } from 'events';

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

interface WriterResult {
  headline: string;
  content: string;
  tldr: string;
}

export class Orchestrator extends EventEmitter {
  private logs: Array<{ id: number; message: string; type: string; timestamp: number; data?: any }> = [];
  private logCounter = 0;
  
  private broadcast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', data?: any) {
    const log = { id: ++this.logCounter, message, type, timestamp: Date.now(), data };
    this.logs.push(log);
    // Keep last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    this.emit('log', log);
  }

  public getLogs(afterId?: number) {
    if (afterId === undefined) return this.logs;
    return this.logs.filter(log => log.id > afterId);
  }

  async runSwarm() {
    const runId = randomUUID();
    const startTime = Date.now();
    logger.info(`Starting swarm run ${runId}`);
    this.broadcast(`Initializing Rogue Swarm Protocol... Run ID: ${runId.slice(0, 8)}`, 'info');

    try {
      // Fetch data manually to avoid tool calling issues with custom LLM
      logger.info('Fetching market data...');
      this.broadcast('Establishing connection to global market data feeds...', 'info');
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
      this.broadcast('Market data aggregated successfully.', 'success', marketData);

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
        this.broadcast('Deploying Scanner Agent to identify anomalies...', 'info');
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
        this.broadcast(`Scanner Agent identified ${scannerResult.candidates?.length || 0} potential candidates.`, 'success', scannerResult);

        if (scannerResult.candidates && scannerResult.candidates.length > 0) {
          // Filter candidates to only include tokens available on Binance Futures
          this.broadcast('Filtering candidates for Binance Futures availability...', 'info');
          const futuresFilteredCandidates = await binanceService.filterFuturesAvailable(scannerResult.candidates);
          this.broadcast(`${futuresFilteredCandidates.length}/${scannerResult.candidates.length} candidates available on Binance Futures.`, 'success');

          if (futuresFilteredCandidates.length === 0) {
            this.broadcast('No candidates available on Binance Futures. Skipping signal generation.', 'warning');
            logger.info('All candidates filtered out - not available on Binance Futures.');
          } else {
            // 2. Analyzer
            logger.info('Running Analyzer Agent...');
            this.broadcast('Deploying Analyzer Agent for deep-dive technical analysis...', 'info');
            const { runner: analyzer } = await AnalyzerAgent.build();
            const analyzerPrompt = `Analyze these candidates: ${JSON.stringify(futuresFilteredCandidates)}
          
            Global Market Context: ${JSON.stringify(marketData.global_market_context)}`;
          
            analyzerResult = await this.runAgentWithRetry<AnalyzerResult>(
              analyzer,
              analyzerPrompt,
              'Analyzer Agent'
            );
            logger.info('Analyzer result:', analyzerResult);

            if (analyzerResult.action === 'signal' && analyzerResult.selected_token && analyzerResult.signal_details) {
              this.broadcast(`High-conviction signal detected for ${analyzerResult.selected_token.symbol}. Confidence: ${analyzerResult.signal_details.confidence}%`, 'success', analyzerResult);
              signalGenerated = true;
            } else {
              this.broadcast('Analyzer Agent filtered out candidates. No high-conviction signal found.', 'warning');
              logger.info('Analyzer decided to skip signal generation.');
            }
          }
        } else {
          this.broadcast('No significant anomalies found by Scanner Agent.', 'warning');
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
        this.broadcast('Content generated successfully.', 'success', generatorResult);

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
        logger.info(`Scheduling Signal for SILVER (+15-20m) for run ${runId}...`);
        await scheduledPostService.schedulePost(runId, 'SILVER', content)
          .catch(err => logger.error('Error scheduling SILVER post', err));

        // Delayed 60-90m: Public (Twitter, DB-backed) - randomized to avoid spam detection
        logger.info(`Scheduling Signal for PUBLIC (+60-90m randomized) for run ${runId}...`);
        await scheduledPostService.schedulePost(runId, 'PUBLIC', content)
          .catch(err => logger.error('Error scheduling PUBLIC post', err));

      } else {
        // Fallback to Intel
        logger.info('Running Intel Flow...');
        this.broadcast('Running Intel Flow...', 'info');
        
        // Fetch recent topics to avoid repetition
        const recentTopics = await supabaseService.getRecentIntelTopics(5);
        logger.info('Recent Intel Topics:', recentTopics);
        
        // Check if we should generate exclusive Deep Dive (only once per Sunday)
        const isSunday = new Date().getDay() === 0;
        const hasDeepDiveToday = isSunday ? await supabaseService.hasDeepDiveToday() : false;
        const shouldGenerateDeepDive = isSunday && !hasDeepDiveToday;
        
        // 1. Intel Agent
        const { runner: intelAgent } = await IntelAgent.build();
        let intelPrompt = shouldGenerateDeepDive
          ? `🔥 PREMIUM DEEP DIVE MODE 🔥

This is an EXCLUSIVE Sunday Deep Dive for Gold/Diamond tier users only. This is NOT a regular intel report.

Your task: Synthesize the ENTIRE WEEK's market movements into a comprehensive strategic analysis.

CURRENT MARKET DATA:
${JSON.stringify(marketData, null, 2)}

THIS WEEK'S COVERAGE (Use these as foundation - synthesize and expand):
${JSON.stringify(recentPosts)}

TOPICS ALREADY COVERED THIS WEEK (Build upon these):
${recentTopics.join(', ')}

Your task: Connect the dots between all these topics. How do they relate? What's the bigger picture?`
          : `Analyze this market data and generate an intel report: ${JSON.stringify(marketData, null, 2)}
        
        RECENTLY POSTED CONTENT (Avoid repeating these):
        ${JSON.stringify(recentPosts)}
        
        AVOID these recently covered topics: ${recentTopics.join(', ')}`;

        if (shouldGenerateDeepDive) {
            intelPrompt += `

Focus on:
1. **Cross-Narrative Connections**: How did different sectors (DeFi, AI, Privacy, Gaming, etc.) interact this week? What capital rotations occurred?
2. **Mindshare vs. Price Divergences**: Which narratives gained social traction but price lagged (or vice versa)? Why?
3. **KOL Influence Analysis**: Which influencer narratives actually moved markets? What did they get right/wrong?
4. **Hidden Alpha**: What non-obvious patterns emerged that most traders missed?
5. **Week-Ahead Positioning**: Based on this week's data, what are the 2-3 highest-conviction plays for next week?
6. **Macro Context**: How did broader market conditions (ETF flows, regulatory news, tech sector moves) impact crypto?
7. **On-Chain Evidence**: What do TVL flows, whale movements, and protocol metrics actually tell us?

IMPORTANCE SCORE: Set to 10 automatically for Deep Dives.
TOPIC: Should be a bold, specific thesis (e.g., "The Silent Rotation: How Privacy Coins Became the Week's Contrarian Play")
INSIGHT: 3-5 paragraphs of genuine strategic analysis with specific numbers, dates, and actionable takeaways.`;
        }
        
        const intelResult = await this.runAgentWithRetry<IntelResult>(
          intelAgent,
          intelPrompt,
          'Intel Agent'
        );
        logger.info('Intel result:', intelResult);
        this.broadcast(`Intel Agent generated report: ${intelResult.topic}`, 'success', intelResult);

        if (intelResult.topic === 'SKIP' || intelResult.importance_score < 7) {
            logger.info('Intel Agent decided to SKIP (Low importance or no new topics).');
            this.broadcast('Intel Agent decided to SKIP (Low importance or no new topics).', 'warning');
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
        this.broadcast('Running Generator Agent (Intel)...', 'info');
        const { runner: generator } = await GeneratorAgent.build();
        const generatorPrompt = shouldGenerateDeepDive 
          ? `Generate content for this PREMIUM DEEP DIVE REPORT.
        
        This is exclusive Sunday content for Gold/Diamond users. Make it EXCEPTIONAL.
        
        Requirements:
        - tweet_text: NOT USED for deep dives (set to empty string or brief teaser)
        - blog_post: A comprehensive 1500-2000 word Markdown article with:
          * Executive Summary (3-4 bullet points of key findings)
          * Multiple sections with H2/H3 headers
          * Data-backed arguments (include specific percentages, dates, prices)
          * Visual hierarchy (use bold, italics, blockquotes for emphasis)
          * Actionable insights (specific entry points, risk levels, timeframes)
          * Forward-looking thesis for next week
        - image_prompt: PREMIUM COVER IMAGE - Create a sophisticated, editorial-style prompt:
          * Think: Financial Times, Bloomberg Markets, or premium research report covers
          * Avoid: Crypto clichés (coins, charts, generic blockchain visuals)
          * Use: Cinematic lighting, architectural elements, abstract financial concepts, luxury aesthetic
          * Examples: "Minimalist marble trading floor bathed in golden hour light, abstract market data streams flowing through brutalist architecture, hyperrealistic 8k, premium editorial photography" or "Luxury penthouse office at night overlooking cityscape, holographic financial data projections, warm amber lighting, architectural digest style, ultra-detailed"
          * Make it look like a $10,000 stock photo, not AI crypto art
        
        Report: ${JSON.stringify(intelResult)}
        
        Make this feel like a $500/month newsletter, not a free blog post.`
          : `Generate content for this INTEL REPORT.
        
        I need both a 'tweet_text' (short, lowercase, alpha vibe) and a 'blog_post' (full markdown analysis).
        
        Report: ${JSON.stringify(intelResult)}`;
        
        const generatorResult = await this.runAgentWithRetry<GeneratorResult>(
          generator,
          generatorPrompt,
          'Generator Agent (Intel)'
        );
        logger.info('Generator result:', generatorResult);
        this.broadcast('Generator Agent produced content.', 'success', generatorResult);

        // 2.1 Writer Agent (Long Form)
        logger.info('Running Writer Agent (Intel)...');
        this.broadcast('Running Writer Agent (Intel)...', 'info');
        const { runner: writer } = await WriterAgent.build();
        const writerPrompt = shouldGenerateDeepDive
          ? `Write an ELITE-TIER investigative article for this PREMIUM DEEP DIVE.
        
        This is exclusive Sunday content worth $100+ in value. Treat it like a Bloomberg/The Block premium piece.
        
        Structure:
        1. **Headline**: Punchy, thesis-driven (10-15 words max)
        2. **Lead Paragraph**: Hook readers with the single most important finding
        3. **Context Section**: What happened this week that matters (300-400 words)
        4. **Deep Analysis**: Multi-angle investigation with sub-sections (800-1000 words):
           - On-chain data interpretation
           - Social sentiment analysis
           - Cross-market correlations
           - Hidden patterns/contrarian takes
        5. **Strategic Implications**: What this means for traders (200-300 words)
        6. **Week Ahead**: Specific plays, price levels, catalysts to watch (200-300 words)
        7. **TLDR**: 3-sentence executive summary for busy traders
        
        Writing Style:
        - Authoritative but accessible
        - Use specific data points ("BTC fell 12.3% to $85,432" not "BTC dropped")
        - Include direct quotes or paraphrases from KOL analysis
        - Call out consensus views then challenge them
        - End sections with clear takeaways
        
        Report Data: ${JSON.stringify(intelResult)}
        
        This should be indistinguishable from premium paid research.`
          : `Write a deep-dive article for this INTEL REPORT.
        Report: ${JSON.stringify(intelResult)}`;
        
        const writerResult = await this.runAgentWithRetry<WriterResult>(
            writer,
            writerPrompt,
            'Writer Agent (Intel)'
        );
        logger.info('Writer result:', writerResult);
        this.broadcast('Writer Agent completed deep-dive article.', 'success', writerResult);

        // 2.5 Image Generation
        let imageUrl: string | null = null;
        if (generatorResult.image_prompt) {
          logger.info('Generating image for intel...');
          this.broadcast('Generating image for intel...', 'info');
          imageUrl = await runwareService.generateImage(generatorResult.image_prompt);
          this.broadcast('Image generated successfully.', 'success', { imageUrl });
        }

        // 3. Publisher (Tiered)
        logger.info(`Publishing Intel for run ${runId}...`);
        this.broadcast(`Publishing Intel for run ${runId}...`, 'info');
        const tweetContent = generatorResult.tweet_text || generatorResult.formatted_content;
        const blogContent = generatorResult.blog_post || generatorResult.formatted_content;
        
        // Save run first to ensure ID exists for scheduled posts
        await this.saveRun(
          runId, 
          shouldGenerateDeepDive ? 'deep_dive' : 'intel', 
          { 
            ...intelResult, 
            tweet_text: tweetContent,
            blog_post: generatorResult.blog_post,
            long_form_content: writerResult.content,
            headline: writerResult.headline,
            tldr: writerResult.tldr,
            image_prompt: generatorResult.image_prompt,
            image_url: imageUrl,
            formatted_tweet: tweetContent, // Keep for backward compat
            log_message: generatorResult.log_message,
            is_deep_dive: shouldGenerateDeepDive,
          }, 
          startTime, 
          null,
          undefined,
          shouldGenerateDeepDive ? null : undefined, // Don't post deep dives publicly
          new Date().toISOString() // telegramDeliveredAt (immediate for Gold/Diamond)
        );

        // Immediate: Gold/Diamond (Blog Post)
        if (blogContent) {
           const prefix = shouldGenerateDeepDive ? '📊 EXCLUSIVE DEEP DIVE 📊\n\n' : '';
           logger.info(`Distributing ${shouldGenerateDeepDive ? 'Deep Dive' : 'Intel'} to GOLD/DIAMOND for run ${runId}...`);
           const intelLink = `https://rogue-adk.vercel.app/app/intel/${runId}`;
           // Use TLDR for Telegram, full content is on the website
           const tldrText = writerResult.tldr || intelResult.insight || 'New intel available';
           const messageWithLink = `${prefix}${writerResult.headline}\n\n${tldrText}\n\n[View full ${shouldGenerateDeepDive ? 'deep dive' : 'intel'} here](${intelLink})`;
           telegramService.broadcastToTiers(messageWithLink, [TIERS.GOLD, TIERS.DIAMOND])
             .catch(err => logger.error('Error distributing to GOLD/DIAMOND', err));
        }

        // Delayed 15-20m: Silver (Blog Post) - SKIP if it's an exclusive Deep Dive
        if (blogContent && !shouldGenerateDeepDive) {
           logger.info(`Scheduling Intel Blog for SILVER (+15-20m) for run ${runId}...`);
           await scheduledPostService.schedulePost(runId, 'SILVER', blogContent)
             .catch(err => logger.error('Error scheduling SILVER intel post', err));
        }

        // Delayed 60-90m: Public (Twitter) - SKIP if it's an exclusive Deep Dive - randomized to avoid spam detection
        if (tweetContent && !shouldGenerateDeepDive) {
           logger.info(`Scheduling Intel Tweet for PUBLIC (+60-90m randomized) for run ${runId}...`);
           await scheduledPostService.schedulePost(runId, 'PUBLIC', tweetContent)
             .catch(err => logger.error('Error scheduling PUBLIC intel post', err));
        } else if (shouldGenerateDeepDive) {
           logger.info(`Deep Dive is exclusive - skipping public distribution for run ${runId}`);
        }
      }
      
      logger.info('Run completed successfully.');
      this.broadcast('Run completed successfully.', 'success');

    } catch (error: any) {
      logger.error('Swarm run failed:', error);
      this.broadcast(`Swarm run failed: ${error.message}`, 'error');
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

  async runAirdropAnalysis() {
    const runId = randomUUID();
    logger.info(`Starting Airdrop Analysis run ${runId}`);

    try {
      const { runner } = await AirdropAgent.build();
      // The prompt is already embedded in the agent instruction, but we need to trigger it.
      // The instruction says "Search strategy — run these exact queries...".
      // We can just ask it to "Execute scan."
      const result = await runner.ask("Execute airdrop scan.") as any;

      if (result.airdrops && result.airdrops.length > 0) {
        logger.info(`Found ${result.airdrops.length} airdrop opportunities. Saving to DB...`);
        await supabaseService.saveAirdrops(result.airdrops);
      } else {
        logger.info('No airdrop opportunities found.');
      }
    } catch (error) {
      logger.error('Error in Airdrop Analysis run', error);
    }
  }

  private async saveRun(
    id: string, 
    type: 'signal' | 'intel' | 'skip' | 'deep_dive', 
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
          const isSchemaError = errorMessage.includes('schema') || errorMessage.includes('validation') || errorMessage.includes('parse') || errorMessage.includes('Tweet text must be under 280 characters');
          
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
7. IF THE ERROR WAS ABOUT TWEET LENGTH: You MUST shorten the 'tweet_text' to be under 280 characters. This is a HARD requirement.

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