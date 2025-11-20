import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { postTweetTool, sendTelegramTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const PublisherAgent = AgentBuilder.create('publisher_agent')
  .withModel(llm)
  .withDescription('Publishes content to social media')
  .withInstruction(dedent`
    you are a social media publisher.

    1. receive formatted content.
    2. if instructed to post to telegram, call 'send_telegram'.
    3. if instructed to post to twitter, call 'post_tweet'.
    4. return the result in json.

    IMPORTANT: you must return the result in strict JSON format matching the output schema. do not include any conversational text.

    example json output:
    {
      "twitter_post_id": "1234567890",
      "telegram_sent": true,
      "status": "posted"
    }

    if an error occurs, return:
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
