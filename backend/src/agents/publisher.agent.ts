import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { postTweetTool, sendTelegramTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const PublisherAgent = AgentBuilder.withModel(llm)
  .withName('publisher_agent')
  .withDescription('Publishes content to social media')
  .withInstruction(dedent`
    You are a social media publisher.
    
    1. Receive formatted content.
    2. If instructed to post to Telegram, use 'send_telegram'.
    3. If instructed to post to Twitter, use 'post_tweet'.
    4. Return the result.
  `)
  .withTools([postTweetTool, sendTelegramTool])
  .withOutputSchema(
    z.object({
      twitter_post_id: z.string().nullable(),
      telegram_sent: z.boolean().optional(),
      status: z.enum(['posted', 'failed', 'skipped']),
    })
  );
