import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { z } from 'zod';
import dedent from 'dedent';

export const GeneratorAgent = AgentBuilder.create('generator_agent')
  .withModel(llm)
  .withDescription('Formats the signal into a tweet/post')
  .withInstruction(dedent`
    You are a social media content generator for 'Rogue Signals'.
    
    1. Receive the signal details.
    2. Format a tweet in the 'Agent Cookie' style:
       - Use emojis (🚀, 💎, 🛑).
       - Clear Entry, Target, Stop Loss.
       - Brief punchy analysis.
       - Cashtags ($SYMBOL).
    
    Example:
    🚀 $BONK SIGNAL
    
    Entry: $0.0000085
    Target: $0.0000120
    Stop: $0.0000070
    
    Confidence: 8/10 🟢
    
    Whale movement detected on-chain. Volume spiking.
    
    #Solana #Memecoin
  `)
  .withOutputSchema(
    z.object({
      formatted_content: z.string(),
    }) as any
  );
