import { AgentBuilder } from '@iqai/adk';
import { scannerLlm } from '../config/llm.config';
import { getYieldPoolsTool } from './tools';
import { z } from 'zod';
import dedent from 'dedent';

// Schema for existing yield opportunity data passed to agent
export const ExistingYieldSchema = z.object({
  pool_id: z.string(),
  protocol: z.string(),
  chain: z.string(),
  symbol: z.string(),
  apy: z.number(),
  tvl: z.number(),
  risk_level: z.enum(['Low', 'Medium', 'High', 'Degen']),
  analysis: z.string().optional(),
  url: z.string().optional(),
  created_at: z.string().optional(),
});

export type ExistingYield = z.infer<typeof ExistingYieldSchema>;

// Function to build yield agent prompt with existing data
export function buildYieldPrompt(existingYields: ExistingYield[]): string {
  const existingDataSection = existingYields.length > 0 
    ? `\n\n**EXISTING YIELD OPPORTUNITIES IN DATABASE (verify these first):**\n${JSON.stringify(existingYields, null, 2)}\n\n`
    : '\n\n**No existing yield opportunities in database.**\n\n';

  return dedent`
    Find the best yield farming opportunities.
    ${existingDataSection}
    First, verify all existing entries are still active, safe, and offer competitive yields.
    Remove any that have been exploited, have significantly reduced APY, or are no longer recommended.
    Then find new high-quality opportunities from fresh data.
    Return the COMPLETE list of all valid yield opportunities (verified existing + newly discovered).
  `;
}

export const YieldAgent = AgentBuilder.create('yield_agent')
  .withModel(scannerLlm)
  .withDescription('Analyzes yield farming opportunities and verifies existing ones')
  .withTools(getYieldPoolsTool)
  .withInstruction(dedent`
    You are a DeFi Yield Farming expert. Your job is to identify the best yield farming opportunities AND verify existing ones.

    You have TWO jobs:
    1. **VERIFY EXISTING DATA**: You will receive a list of current yield opportunities in our database. For each one:
       - Check if the protocol is still safe (no recent hacks/exploits)
       - Verify the APY is still competitive and sustainable
       - Confirm the pool still exists and has good TVL
       - If it's still valid, KEEP it in your output (update APY/TVL if changed)
       - If it's been exploited, APY crashed, or no longer recommended, EXCLUDE it
    
    2. **DISCOVER NEW OPPORTUNITIES**: 
       a. **Fetch Yield Pools**: Use the 'get_yield_pools' tool to get the latest data.
       b. **Analyze & Research**:
          - For the top candidates, use your built-in X (Twitter) and web search capabilities to check for:
            - Protocol safety/hacks.
            - Sustainability of the yield (is it real yield or inflationary token printing?).
            - Community sentiment.
       c. **Select the Best**:
          - Select at least 10 opportunities if possible.
          - **Mix of Risk Levels**: Include a mix of 'Low' risk (stable, established), 'Medium' risk, and 'High/Degen' risk (high APY, newer protocols).
          - **Don't just pick stablecoins**. Look for volatile pairs with high APY if the protocol seems legit.
          - Look for "Real Yield" narratives.
          - Diversify across chains if possible.

    **CRITICAL**: Your output will COMPLETELY REPLACE the existing database. Only include opportunities that are:
    - Currently active and safe
    - Have competitive, sustainable yields
    - Not duplicates (use pool_id as unique identifier)

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
