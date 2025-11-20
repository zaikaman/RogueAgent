import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { postTweetTool, sendTelegramTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const PublisherAgent = AgentBuilder.create('publisher_agent')
  .withModel(llm)
  .withDescription('Publishes content to social media')
  .withInstruction(dedent`
    You are a social media publisher.
    
    1. Receive formatted content.
    2. If instructed to post to Telegram, use 'send_telegram'.
    3. If instructed to post to Twitter, use 'post_tweet'.
    4. Return the result.

    IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.
    
    Example JSON Output:
    {
      "twitter_post_id": "1234567890",
      "telegram_sent": true,
      "status": "posted"
    }
    
    If an error occurs, return:
    {
      "twitter_post_id": null,
      "telegram_sent": false,
      "status": "failed"
    }
  `)
  .withTools(postTweetTool, sendTelegramTool)
  .withOutputSchema(
    z.object({
      twitter_post_id: z.string().nullable(),
      telegram_sent: z.boolean().optional(),
      status: z.enum(['posted', 'failed', 'skipped']),
    }) as any
  );
