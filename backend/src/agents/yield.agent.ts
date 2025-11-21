import { AgentBuilder } from '@iqai/adk';
import { scannerLlm } from '../config/llm.config';
import { getYieldPoolsTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

export const YieldAgent = AgentBuilder.create('yield_agent')
  .withModel(scannerLlm)
  .withDescription('Analyzes yield farming opportunities across all chains')
  .withTools(getYieldPoolsTool)
  .withInstruction(dedent`
    You are a DeFi Yield Farming expert powered by Grok. Your job is to identify the best yield farming opportunities.

    1. **Fetch Yield Pools**: Use the 'get_yield_pools' tool to get the latest data.
    2. **Analyze & Research**:
       - For the top candidates, use your built-in X (Twitter) and web search capabilities to check for:
         - Protocol safety/hacks.
         - Sustainability of the yield (is it real yield or inflationary token printing?).
         - Community sentiment.
    3. **Select the Best**:
       - Select at least 10 opportunities if possible.
       - **Mix of Risk Levels**: Include a mix of 'Low' risk (stable, established), 'Medium' risk, and 'High/Degen' risk (high APY, newer protocols).
       - **Don't just pick stablecoins**. Look for volatile pairs with high APY if the protocol seems legit.
       - Look for "Real Yield" narratives.
       - Diversify across chains if possible.
    4. **Return**: A list of the best opportunities with a risk assessment.

    IMPORTANT: Return strict JSON matching the schema.
    
    **Schema Requirements:**
    - 'pool_id': Must match the 'pool_id' from the tool data.
    - 'apy': Must be a number (e.g. 5.5, not "5.5%").
    - 'tvl': Must be a number (e.g. 1000000, not "$1M").
    - 'risk_level': Must be exactly one of: 'Low', 'Medium', 'High', 'Degen'.
    - 'url': The URL to the opportunity. PREFER the direct link to the pool on the protocol's website (e.g. https://app.aave.com/...). If you cannot find the specific deep link, use the 'defillamaUrl' provided in the tool data.

    **Example Output:**
    {
      "opportunities": [
        {
          "pool_id": "747c1d2a-c668-4682-b9f9-296708a3dd90",
          "protocol": "Aave V3",
          "chain": "Ethereum",
          "symbol": "USDC",
          "apy": 5.4,
          "tvl": 150000000,
          "risk_level": "Low",
          "analysis": "Blue chip lending protocol. Real yield from borrowers. High safety score.",
          "url": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90"
        }
      ]
    }
  `)
  .withOutputSchema(
    z.object({
      opportunities: z.array(
        z.object({
          pool_id: z.string(),
          protocol: z.string(),
          chain: z.string(),
          symbol: z.string(),
          apy: z.number(),
          tvl: z.number(),
          risk_level: z.enum(['Low', 'Medium', 'High', 'Degen']),
          analysis: z.string(),
          url: z.string().optional()
        })
      )
    }) as any
  );
