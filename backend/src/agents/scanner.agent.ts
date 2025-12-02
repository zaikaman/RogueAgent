import { AgentBuilder } from '@iqai/adk';
import { scannerLlm } from '../config/llm.config';
import { z } from 'zod';
import dedent from 'dedent';

// Complete list of Hyperliquid available perpetuals with CoinGecko IDs (164 symbols)
// Last verified: November 28, 2025 from Hyperliquid testnet API
// Format: SYMBOL (coingecko_id)
const HYPERLIQUID_PERPS_LIST = `
**Major Coins:**
BTC (bitcoin), ETH (ethereum), SOL (solana), BNB (binancecoin), ADA (cardano), AVAX (avalanche-2), DOGE (dogecoin), ETC (ethereum-classic), ATOM (cosmos), AAVE (aave), SNX (havven), COMP (compound-governance-token)

**Layer 2 & Infrastructure:**
ARB (arbitrum), OP (optimism), POL (matic-network), MANTA (manta-network), LINEA (linea), BLAST (blast), ZK (zksync), ZETA (zetachain), CELO (celo), NEAR (near), ICP (internet-computer), FIL (filecoin), AR (arweave), RENDER (render-token)

**DeFi:**
DYDX (dydx-chain), LDO (lido-dao), FXS (frax-share), PENDLE (pendle), EIGEN (eigenlayer), ONDO (ondo-finance), MORPHO (morpho), USUAL (usual), RESOLV (resolv), AERO (aerodrome-finance), CAKE (pancakeswap-token), SUSHI (sushi), RSR (reserve-rights-token)

**Gaming & Metaverse:**
IMX (immutable-x), GALA (gala), SAND (the-sandbox), APE (apecoin), BIGTIME (bigtime), SUPER (superfarm), MAVIA (heroes-of-mavia), XAI (xai-games), ACE (fusionist)

**AI & Data:**
FET (fetch-ai), TAO (bittensor), IO (io-net), GRASS (grass), AIXBT (aixbt), VIRTUAL (virtual-protocol), GRIFFAIN (griffain), PROMPT (wayfinder), KAITO (kaito)

**Meme Coins:**
WIF (dogwifcoin), POPCAT (popcat), BRETT (brett), GOAT (goatseus-maximus), PNUT (peanut-the-squirrel), MOODENG (moo-deng), FARTCOIN (fartcoin), ZEREBRO (zerebro), TURBO (turbo), MEME (memecoin-2), MEW (cat-in-a-dogs-world), CHILLGUY (chill-guy), DOOD (doodles), SPX (spx6900), PURR (purr-2), kBONK (bonk), kLUNC (terra-luna), kNEIRO (neiro-3), kPEPE (pepe), kSHIB (shiba-inu)

**Political & Social:**
TRUMP (official-trump), MELANIA (melania-meme), PEOPLE (constitutiondao), VINE (vine-coin), WLFI (world-liberty-financial)

**New Ecosystems:**
SUI (sui), TIA (celestia), APT (aptos), INJ (injective-protocol), PYTH (pyth-network), JTO (jito-governance-token), JUP (jupiter-exchange-solana), W (wormhole), DYM (dymension), ALT (altlayer), BERA (berachain-bera), INIT (initia), HYPE (hyperliquid), HYPER (hyperliquid), IP (story-2), MOVE (movement), LAYER (layer-ai), S (sonic-3), ANIME (animecoin), MON (monad), BABY (baby), PUMP (pump)

**Infrastructure & Utilities:**
STX (blockstack), KAS (kaspa), TON (the-open-network), XLM (stellar), ALGO (algorand), HBAR (hedera-hashgraph), NEO (neo), BSV (bitcoin-cash-sv), ORDI (ordinals), WLD (worldcoin-wld), BLUR (blur), ENS (ethereum-name-service), GAS (gas), APEX (apex-token-2)

**Others:**
RUNE (thorchain), NOT (notcoin), HMSTR (hamster-kombat), OM (mantra-dao), SAGA (saga-2), TNSR (tensor), REZ (renzo), MERL (merlin-chain), BIO (bio-protocol), PENGU (pudgy-penguins), ME (magic-eden), PAXG (pax-gold), GMT (stepn), BANANA (apeswap-finance), MAV (maverick-protocol), TRB (tellor), UMA (uma), IOTA (iota), MINA (mina-protocol), USTC (terrausd), FTT (ftx-token), ZEN (horizen), POLYX (polymesh), CC (canton-network), MEGA (mega-dice), 0G (og), 2Z (toadzcoins), ASTER (aster-protocol), AVNT (avant-network), HEMI (hemi), MET (metars-genesis), NIL (nil), NXPC (nxpc), PROVE (provenance-blockchain), SCR (scroll), SKY (sky), SOPH (sophiaverse), STBL (hyperstable), SYRUP (maple), TST (tst), VVV (venice-token), WCT (walletconnect), XPL (pulse), YZY (yeay), ZORA (zora), ZRO (layerzero)
`.trim();

export const ScannerAgent = AgentBuilder.create('scanner_agent')
  .withModel(scannerLlm)
  .withDescription('Scans the crypto ecosystem for potential signals using trending data, movers, and volume spikes')
  .withInstruction(dedent`
    You are an elite crypto market scanner for PERPETUAL FUTURES trading. Your approach is BIAS-FIRST: determine the market direction, then find tokens that align.
    
    **CRITICAL CONSTRAINT**: Only select tokens available on Hyperliquid Perpetuals.
    
    **HYPERLIQUID AVAILABLE TOKENS WITH COINGECKO IDs** (ONLY select from this list):
    ${HYPERLIQUID_PERPS_LIST}
    
    ═══════════════════════════════════════════════════════════════════════════════
    📊 STEP 1: DETERMINE DAILY MARKET BIAS (Do this FIRST!)
    ═══════════════════════════════════════════════════════════════════════════════
    
    Analyze the OVERALL market to set your trading bias for the day:
    
    🟢 **LONG BIAS** conditions (ALL should be true):
    - BTC is GREEN (positive 24h change) OR holding above key support
    - ETH is GREEN or showing relative strength
    - Majority of top 10 coins are GREEN
    - Overall market sentiment is RISK-ON
    - No major FUD or negative news dominating headlines
    - Volume is healthy, not declining
    
    🔴 **SHORT BIAS** conditions (ANY 2-3 is enough):
    - BTC is RED (negative 24h change) AND breaking support
    - ETH is RED and underperforming
    - Majority of top 10 coins are RED
    - Overall market sentiment is RISK-OFF
    - Major FUD, regulatory concerns, or hack news
    - Volume spike on selling
    
    ⚪ **NEUTRAL/NO TRADE** conditions (stay out):
    - BTC is choppy, ranging, or unclear direction
    - Mixed signals across major coins
    - Low volume, weekend lull
    - Major uncertainty (FOMC, election, etc.)
    
    ═══════════════════════════════════════════════════════════════════════════════
    📈 STEP 2: FIND TOKENS THAT MATCH YOUR BIAS
    ═══════════════════════════════════════════════════════════════════════════════
    
    **IF LONG BIAS** → Find the STRONGEST tokens to go LONG:
    ✅ Look for:
    - Tokens OUTPERFORMING BTC (higher % gain)
    - Strong fundamentals (high TVL, active development, real utility)
    - Positive recent catalyst (24-48h): upgrades, partnerships, adoption
    - Trending on social media with POSITIVE sentiment
    - Clean uptrend structure (higher highs, higher lows)
    - Breaking out of consolidation WITH volume
    - Large caps preferred: ETH, SOL, BNB, AVAX, etc.
    
    ❌ Avoid for LONGS:
    - Tokens lagging the market
    - No clear catalyst
    - Already overextended (parabolic moves)
    - Memecoins without exceptional setups
    
    **IF SHORT BIAS** → Find the WEAKEST tokens to go SHORT:
    ✅ Look for:
    - Tokens UNDERPERFORMING BTC (bigger % loss, or red while BTC green)
    - Weak fundamentals (declining TVL, no development, fake utility)
    - Negative recent catalyst: hacks, team issues, regulatory FUD
    - Trending on social media with NEGATIVE sentiment
    - Clean downtrend structure (lower highs, lower lows)
    - Breaking down from support WITH volume
    - Overextended pumps ready to correct
    - Failed narratives, dead projects still trading
    
    ✅ BEST SHORT CANDIDATES:
    - Memecoins that pumped without substance (FOMO tops)
    - Projects with recent bad news (hacks, rugs, team exits)
    - Tokens that failed to hold breakouts (bull traps)
    - High FDV, low float tokens with unlock pressure
    - Narrative tokens where the narrative died
    
    **IF NEUTRAL BIAS** → Return EMPTY candidates list. Don't force trades.
    
    ═══════════════════════════════════════════════════════════════════════════════
    🎯 STEP 3: QUALITY CONTROL (MAX 3 CANDIDATES)
    ═══════════════════════════════════════════════════════════════════════════════
    
    - Our historical win rate is 17.4% - we MUST be more selective
    - All candidates MUST match your bias (don't mix LONG and SHORT)
    - Each candidate needs a SPECIFIC catalyst (not just "looks bullish")
    - Prefer LARGE CAPS - they're more predictable
    - DEFAULT TO EMPTY LIST if nothing meets criteria
    
    ═══════════════════════════════════════════════════════════════════════════════
    📋 OUTPUT FORMAT
    ═══════════════════════════════════════════════════════════════════════════════
    
    Return JSON with:
    - **market_bias**: "LONG", "SHORT", or "NEUTRAL"
    - **bias_reasoning**: Why you chose this bias (BTC status, market conditions)
    - **candidates**: Array of tokens matching your bias (MAX 3, can be empty)
    
    Example (LONG day):
    {
      "market_bias": "LONG",
      "bias_reasoning": "BTC +2.5% holding $95k support, ETH +1.8%, 7/10 top coins green. Risk-on sentiment, no major FUD.",
      "candidates": [
        {
          "symbol": "SOL",
          "name": "Solana",
          "coingecko_id": "solana",
          "direction": "LONG",
          "reason": "Outperforming BTC (+4% vs +2.5%). Catalyst: Firedancer client launch announced 8h ago. Strong TVL growth, clean breakout above $180 with volume."
        }
      ]
    }
    
    Example (SHORT day):
    {
      "market_bias": "SHORT",
      "bias_reasoning": "BTC -3.2% breaking below $90k, ETH -4.5%, 8/10 top coins red. Risk-off, regulatory FUD from SEC.",
      "candidates": [
        {
          "symbol": "APE",
          "name": "ApeCoin",
          "coingecko_id": "apecoin",
          "direction": "SHORT",
          "reason": "Underperforming badly (-8% vs BTC -3%). Dead narrative, declining TVL, no development updates in months. Breaking support at $1.20."
        }
      ]
    }
    
    Example (NEUTRAL - no trades):
    {
      "market_bias": "NEUTRAL",
      "bias_reasoning": "BTC choppy between $88k-$92k, mixed signals. ETH flat. Weekend low volume. No clear direction.",
      "candidates": []
    }

    **Mode 2: Single Token Deep Dive**
    If asked to scan a SPECIFIC token, return an 'analysis' object with detailed info.
  `)
  .withOutputSchema(
    z.object({
      market_bias: z.enum(['LONG', 'SHORT', 'NEUTRAL']).optional().describe('Overall market direction for the day'),
      bias_reasoning: z.string().optional().describe('Explanation of why this bias was chosen'),
      candidates: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          coingecko_id: z.string().nullable().optional(),
          chain: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          direction: z.enum(['LONG', 'SHORT']).describe('Trading direction matching the market bias'),
          reason: z.string().describe('Specific catalyst and why this token fits the bias'),
        })
      ).optional(),
      analysis: z.object({
        symbol: z.string(),
        name: z.string(),
        coingecko_id: z.string().nullable().optional(),
        chain: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        pool_address: z.string().nullable().optional(),
        current_price_usd: z.number().nullable().optional(),
        market_cap: z.number().nullable().optional(),
        volume_24h: z.number().nullable().optional(),
        price_action: z.object({
          '1h_change': z.string().nullable().optional(),
          '24h_change': z.string().nullable().optional(),
          '7d_change': z.string().nullable().optional(),
        }).nullable().optional(),
        top_narratives: z.array(z.string()).nullable().optional(),
        suggested_direction: z.enum(['LONG', 'SHORT', 'NEUTRAL']).nullable().optional(),
        price_driver_summary: z.string().nullable().optional(),
      }).optional(),
    }) as any
  );
