import { supabaseService } from './supabase.service';
import { telegramService } from './telegram.service';
import { twitterService } from './twitter.service';
import { iqAiService } from './iqai.service';
import { logger } from '../utils/logger.util';
import { TIERS } from '../constants/tiers';

export class ScheduledPostService {
  
  async processPendingPosts() {
    try {
      const pendingPosts = await supabaseService.getPendingScheduledPosts();
      
      if (pendingPosts.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingPosts.length} scheduled posts...`);

      for (const post of pendingPosts) {
        try {
          logger.info(`Publishing scheduled post ${post.id} to ${post.tier}`);

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
                    const twitterLink = `https://x.com/RogueADK/status/${tweetId}`;
                    logContent = `${baseLog} ${twitterLink}`;
                  } else if (run.type === 'intel') {
                    const topic = run.content.topic || 'Market Intel';
                    const intelLink = `https://rogue-adk.vercel.app/app/intel/${run.id}`;
                    logContent = `intel ping: ${topic}. ${intelLink}`;
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

        } catch (error: any) {
          logger.error(`Error publishing scheduled post ${post.id}:`, error);
          
          // Mark as failed
          await supabaseService.updateScheduledPost(post.id, {
            status: 'failed',
            error_message: error.message
          });
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
    delayMinutes: number
  ) {
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
    
    logger.info(`Scheduling ${tier} post for run ${runId} at ${scheduledFor} (+${delayMinutes}m)`);
    
    return await supabaseService.createScheduledPost({
      run_id: runId,
      tier,
      content,
      scheduled_for: scheduledFor
    });
  }
}

export const scheduledPostService = new ScheduledPostService();
