import { supabaseService } from './supabase.service';
import { telegramService } from './telegram.service';
import { twitterService } from './twitter.service';
import { iqAiService } from './iqai.service';
import { logger } from '../utils/logger.util';
import { TIERS } from '../constants/tiers';
import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { z } from 'zod';

/**
 * Generate a random delay in minutes between min and max (inclusive)
 * Used to add jitter to posting schedules to avoid spam detection
 */
export function getRandomDelayMinutes(minMinutes: number, maxMinutes: number): number {
  return Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
}

// Default delay config for different tiers (in minutes)
export const POST_DELAY_CONFIG = {
  SILVER: 15,                         // Fixed 15 minutes after signal (Telegram only)
  PUBLIC: 30,                         // Fixed 30 minutes after signal
};

const ShortenerAgent = AgentBuilder.create('shortener_agent')
  .withModel(llm)
  .withDescription('Shortens text to fit Twitter limits')
  .withInstruction('You are a text shortener. Your ONLY job is to shorten the input text to be under 270 characters while preserving the core meaning, tickers, and hashtags. Return ONLY the shortened text. Do not add quotes or conversational filler.')
  .withInputSchema(z.object({ text: z.string() }) as any)
  .withOutputSchema(z.object({ shortened_text: z.string() }) as any);

export class ScheduledPostService {
  
  async processPendingPosts() {
    try {
      const pendingPosts = await supabaseService.getPendingScheduledPosts();
      
      if (pendingPosts.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingPosts.length} scheduled posts...`);

      for (let i = 0; i < pendingPosts.length; i++) {
        const post = pendingPosts[i];
        try {
          logger.info(`Publishing scheduled post ${post.id} (${i + 1}/${pendingPosts.length}) to ${post.tier}`);

          if (post.tier === 'PUBLIC') {
            // Post to Twitter
            const tweetId = await twitterService.postTweet(post.content);
            if (tweetId) {
              logger.info(`Twitter post successful for scheduled post ${post.id}: ${tweetId}`);
              
              // Update the original run with public_posted_at
              await supabaseService.updateRun(post.run_id, { 
                public_posted_at: new Date().toISOString() 
              });

              // Post to IQ AI
              try {
                const run = await supabaseService.getRunById(post.run_id);
                if (run && run.content) {
                  let logContent = '';
                  
                  if (run.type === 'signal') {
                    const baseLog = run.content.log_message || `SIGNAL LOCKED: ${run.content.token?.symbol || 'Unknown'} signal detected.`;
                    const twitterLink = `https://x.com/Rogue_IQAI/status/${tweetId}`;
                    logContent = `${baseLog} ${twitterLink}`;
                  } else if (run.type === 'intel') {
                    const baseLog = run.content.log_message || `INTEL EXTRACTED: ${run.content.topic || 'Market analysis'} complete.`;
                    const intelLink = `https://rogue-adk.vercel.app/app/intel/${run.id}`;
                    logContent = `${baseLog} ${intelLink}`;
                  }

                  if (logContent) {
                    await iqAiService.postLog(logContent);
                  }
                }
              } catch (error) {
                logger.error('Error posting log to IQ AI:', error);
              }
            }
          } else {
            // Post to Telegram tier
            const tier = post.tier as 'SILVER' | 'GOLD' | 'DIAMOND';
            await telegramService.broadcastToTiers(post.content, [TIERS[tier]]);
          }

          // Mark as posted
          await supabaseService.updateScheduledPost(post.id, {
            status: 'posted',
            posted_at: new Date().toISOString()
          });

          logger.info(`Successfully published scheduled post ${post.id}`);

          // Add delay between posts to avoid rate limiting (only if more posts remain)
          if (i < pendingPosts.length - 1 && post.tier === 'PUBLIC') {
            const delaySeconds = 10;
            logger.info(`Waiting ${delaySeconds}s before next post to avoid rate limits...`);
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          }

        } catch (error: any) {
          logger.error(`Error publishing scheduled post ${post.id}:`, error);

          let handled = false;

          // Check if error is length related (186 is Twitter's code for too long)
          if (error.message && (error.message.includes('186') || error.message.includes('shorter') || error.message.includes('too long'))) {
             logger.info(`Tweet too long for post ${post.id}. Attempting to shorten...`);
             try {
                const { runner } = await ShortenerAgent.build();
                const result = await (runner as any).run({ text: post.content });
                
                if (result.shortened_text) {
                   logger.info(`Shortened tweet: ${result.shortened_text}`);
                   // Retry posting
                   const tweetId = await twitterService.postTweet(result.shortened_text);
                   if (tweetId) {
                      logger.info(`Twitter post successful after shortening for scheduled post ${post.id}: ${tweetId}`);
                      
                      // Update the original run with public_posted_at
                      await supabaseService.updateRun(post.run_id, { 
                        public_posted_at: new Date().toISOString() 
                      });

                      // Update scheduled post with new content and status
                      await supabaseService.updateScheduledPost(post.id, {
                        content: result.shortened_text,
                        status: 'posted',
                        posted_at: new Date().toISOString()
                      });
                      
                      // Post to IQ AI
                      try {
                        const run = await supabaseService.getRunById(post.run_id);
                        if (run && run.content) {
                          let logContent = '';
                          
                          if (run.type === 'signal') {
                            const baseLog = run.content.log_message || `SIGNAL LOCKED: ${run.content.token?.symbol || 'Unknown'} signal detected.`;
                            const twitterLink = `https://x.com/Rogue_IQAI/status/${tweetId}`;
                            logContent = `${baseLog} ${twitterLink}`;
                          } else if (run.type === 'intel') {
                            const baseLog = run.content.log_message || `INTEL EXTRACTED: ${run.content.topic || 'Market analysis'} complete.`;
                            const intelLink = `https://rogue-adk.vercel.app/app/intel/${run.id}`;
                            logContent = `${baseLog} ${intelLink}`;
                          }

                          if (logContent) {
                            await iqAiService.postLog(logContent);
                          }
                        }
                      } catch (error) {
                        logger.error('Error posting log to IQ AI:', error);
                      }
                      
                      handled = true;
                   }
                }
             } catch (shortenError) {
                logger.error('Failed to shorten tweet:', shortenError);
             }
          }
          
          if (!handled) {
            // Mark as failed
            await supabaseService.updateScheduledPost(post.id, {
              status: 'failed',
              error_message: error.message
            });
          }
        }
      }

    } catch (error) {
      logger.error('Error processing scheduled posts:', error);
    }
  }

  async schedulePost(
    runId: string,
    tier: 'SILVER' | 'GOLD' | 'DIAMOND' | 'PUBLIC',
    content: string,
    delayMinutes?: number
  ) {
    // PUBLIC uses fixed 30 minutes, SILVER uses fixed 15 minutes
    let actualDelay: number;
    if (delayMinutes !== undefined) {
      actualDelay = delayMinutes;
    } else if (tier === 'PUBLIC') {
      actualDelay = POST_DELAY_CONFIG.PUBLIC; // Fixed 30 minutes
    } else if (tier === 'SILVER') {
      actualDelay = POST_DELAY_CONFIG.SILVER; // Fixed 15 minutes
    } else {
      actualDelay = 0; // Immediate for GOLD/DIAMOND
    }
    
    const scheduledFor = new Date(Date.now() + actualDelay * 60 * 1000).toISOString();
    
    logger.info(`Scheduling ${tier} post for run ${runId} at ${scheduledFor} (+${actualDelay}m)`);
    
    return await supabaseService.createScheduledPost({
      run_id: runId,
      tier,
      content,
      scheduled_for: scheduledFor
    });
  }
}

export const scheduledPostService = new ScheduledPostService();
