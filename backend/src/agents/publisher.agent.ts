import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { postTweetTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const PublisherAgent = AgentBuilder.withModel(llm)
  .withName('publisher_agent')
  .withDescription('Publishes content to social media')
  .withInstruction(dedent`
    You are a social media publisher.
    
    1. Receive formatted content.
    2. Post it to Twitter using 'post_tweet'.
    3. Return the result.
  `)
  .withTools([postTweetTool])
  .withOutputSchema(
    z.object({
      twitter_post_id: z.string().nullable(),
      status: z.enum(['posted', 'failed', 'skipped']),
    })
  );
