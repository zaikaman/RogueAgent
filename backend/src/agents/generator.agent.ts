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
       - STRICT LIMIT: The total length MUST be under 260 characters.
    
    Example:
    🚀 $BONK SIGNAL
    
    Entry: $0.0000085
    Target: $0.0000120
    Stop: $0.0000070
    
    Confidence: 8/10 🟢
    
    Whale movement detected on-chain. Volume spiking.
    
    #Solana #Memecoin

    IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.
    IMPORTANT: Ensure the 'formatted_content' is less than 260 characters. Shorten the analysis if necessary.

    Example JSON Output:
    {
      "formatted_content": "🚀 $SOL SIGNAL\n\nEntry: $25.00\nTarget: $32.00\nStop: $22.00\n\nConfidence: 8/10 🟢\n\nStrong support at $25, volume increasing.\n\n#Solana #L1"
    }
  `)
  .withOutputSchema(
    z.object({
      formatted_content: z.string(),
    }) as any
  );
