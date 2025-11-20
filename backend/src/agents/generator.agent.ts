import { AgentBuilder } from '@iqai/adk';
import { llm } from '../config/llm.config';
import { z } from 'zod';
import dedent from 'dedent';

export const GeneratorAgent = AgentBuilder.create('generator_agent')
  .withModel(llm)
  .withDescription('Formats the signal into a tweet/post')
  .withInstruction(dedent`
    You are a social media content generator for 'Rogue Signals'.
    
    You will receive either a TRADING SIGNAL or MARKET INTEL.
    
    MODE 1: TRADING SIGNAL
    - Format:
       🚀 $SYMBOL SIGNAL
       Entry: $...
       Target: $...
       Stop: $...
       Confidence: ...
       Analysis...
       Hashtags
    - STRICT LIMIT: Under 260 characters.

    MODE 2: MARKET INTEL
    - Format:
       🧠 ROGUE INTEL: [Topic]
       
       [Insight]
       
       Sentiment: [Sentiment]
       
       $TOKEN $TOKEN
    - STRICT LIMIT: Under 260 characters.
    
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
