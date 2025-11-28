import { AgentBuilder } from '@iqai/adk';
import { scannerLlm } from '../config/llm.config';
import { z } from 'zod';
import dedent from 'dedent';

// Complete list of Hyperliquid available perpetuals with CoinGecko IDs
// Format: SYMBOL (coingecko_id)
const HYPERLIQUID_PERPS_LIST = `
**Major Coins:**
BTC (bitcoin), ETH (ethereum), SOL (solana), BNB (binancecoin), XRP (ripple), ADA (cardano), AVAX (avalanche-2), DOGE (dogecoin), DOT (polkadot), LINK (chainlink), LTC (litecoin), BCH (bitcoin-cash), ETC (ethereum-classic), ATOM (cosmos), UNI (uniswap), AAVE (aave), MKR (maker), SNX (havven), COMP (compound-governance-token), CRV (curve-dao-token)

**Layer 2 & Infrastructure:**
ARB (arbitrum), OP (optimism), MATIC (matic-network), POL (matic-network), STRK (starknet), MANTA (manta-network), LINEA (linea), BLAST (blast), ZK (zksync), SCROLL (scroll), BASE (base), ZETA (zetachain), METIS (metis-token), CELO (celo), NEAR (near), ICP (internet-computer), FIL (filecoin), AR (arweave), RENDER (render-token), RNDR (render-token)

**DeFi:**
DYDX (dydx-chain), GMX (gmx), LDO (lido-dao), FXS (frax-share), PENDLE (pendle), EIGEN (eigenlayer), ETHFI (ether-fi), ENA (ethena), ONDO (ondo-finance), MORPHO (morpho), USUAL (usual), RESOLV (resolv), LISTA (lista-dao), AERO (aerodrome-finance), CAKE (pancakeswap-token), SUSHI (sushi), BADGER (badger-dao), RSR (reserve-rights-token), RDNT (radiant-capital)

**Gaming & Metaverse:**
IMX (immutable-x), GALA (gala), SAND (the-sandbox), APE (apecoin), ILV (illuvium), YGG (yield-guild-games), BIGTIME (bigtime), PIXEL (pixels), SUPER (superfarm), NFTI (nfti), MAVIA (heroes-of-mavia), PRIME (echelon-prime), XAI (xai-games), BEAM (beam-2), PORTAL (portal-2), ACE (fusionist), RON (ronin)

**AI & Data:**
FET (fetch-ai), TAO (bittensor), IO (io-net), GRASS (grass), AI16Z (ai16z), AIXBT (aixbt), VIRTUAL (virtual-protocol), GRIFFAIN (griffain), AI (sleepless-ai), PROMPT (wayfinder), KAITO (kaito)

**Meme Coins:**
SHIB (shiba-inu), PEPE (pepe), BONK (bonk), FLOKI (floki), WIF (dogwifcoin), POPCAT (popcat), BRETT (brett), NEIRO (neiro-3), GOAT (goatseus-maximus), PNUT (peanut-the-squirrel), MOODENG (moo-deng), FARTCOIN (fartcoin), ZEREBRO (zerebro), TURBO (turbo), MEME (memecoin-2), MYRO (myro), MEW (cat-in-a-dogs-world), BOME (book-of-meme), CHILLGUY (chill-guy), DOOD (doodles), SPX (spx6900), HPOS (ethereum-is-good), PURR (purr-2), NEIROETH (neiro-2), kBONK (bonk), kDOGS (dogs-2), kFLOKI (floki), kLUNC (terra-luna), kNEIRO (neiro-3), kPEPE (pepe), kSHIB (shiba-inu)

**Political & Social:**
TRUMP (official-trump), MELANIA (melania-meme), PEOPLE (constitutiondao), FRIEND (friend-tech), VINE (vine-coin), WLFI (world-liberty-financial)

**New Ecosystems:**
SUI (sui), SEI (sei-network), TIA (celestia), APT (aptos), INJ (injective-protocol), PYTH (pyth-network), JTO (jito-governance-token), JUP (jupiter-exchange-solana), W (wormhole), DYM (dymension), ALT (altlayer), BERA (berachain-bera), INIT (initia), HYPE (hyperliquid), HYPER (hyperliquid), IP (story-2), MOVE (movement), LAYER (layer-ai), S (sonic-3), ANIME (animecoin), MON (monad), BABY (baby), LAUNCHCOIN (believe-in-something), PUMP (pump)

**Infrastructure & Utilities:**
STX (blockstack), KAS (kaspa), TON (the-open-network), TRX (tron), XLM (stellar), ALGO (algorand), HBAR (hedera-hashgraph), NEO (neo), ZEC (zcash), BSV (bitcoin-cash-sv), ORDI (ordinals), WLD (worldcoin-wld), BLUR (blur), ENS (ethereum-name-service), GAS (gas), BLZ (bluzelle), OGN (origin-protocol), APEX (apex-token-2), CYBER (cyberconnect)

**Others:**
FTM (fantom), RUNE (thorchain), NOT (notcoin), HMSTR (hamster-kombat), CATI (catizen), DOGS (dogs-2), OM (mantra-dao), OMNI (omni-network), SAGA (saga-2), TNSR (tensor), REZ (renzo), MERL (merlin-chain), BIO (bio-protocol), PENGU (pudgy-penguins), ME (magic-eden), PAXG (pax-gold), RLB (rollbit-coin), UNIBOT (unibot), GMT (stepn), BANANA (apeswap-finance), MAV (maverick-protocol), TRB (tellor), STG (stargate-finance), UMA (uma), BNT (bancor), ARK (ark), NTRN (neutron-3), IOTA (iota), MINA (mina-protocol), CFX (conflux-token), CANTO (canto), MNT (mantle), LOOM (loom-network-new), REQ (request-network), USTC (terrausd), FTT (ftx-token), ZEN (horizen), ORBS (orbs), POLYX (polymesh), STRAX (stratis), PANDORA (pandora), OX (ox-coin), CC (canton-network), MEGA (mega-dice), SHIA (shia), 0G (og), 2Z (toadzcoins), ASTER (aster-protocol), AVNT (avant-network), HEMI (hemi), JELLY (jelly-meme), MET (metars-genesis), NIL (nil), NXPC (nxpc), PROVE (provenance-blockchain), SCR (scroll), SKY (sky), SOPH (sophiaverse), STBL (hyperstable), SYRUP (maple), TST (tst), VVV (venice-token), WCT (walletconnect), XPL (pulse), YZY (yeay), ZORA (zora), ZRO (layerzero)
`.trim();

export const ScannerAgent = AgentBuilder.create('scanner_agent')
  .withModel(scannerLlm)
  .withDescription('Scans the crypto ecosystem for potential signals using trending data, movers, and volume spikes')
  .withInstruction(dedent`
    You are a crypto market scanner for PERPETUAL FUTURES trading. Your job is to identify potential tokens for LONG or SHORT signals based on market data.
    
    **CRITICAL CONSTRAINT**: Only select tokens that are available on Hyperliquid Perpetuals.
    
    **HYPERLIQUID AVAILABLE TOKENS WITH COINGECKO IDs** (ONLY select from this list - use coingecko_id in parentheses for price lookups):
    ${HYPERLIQUID_PERPS_LIST}
    
    **AVOID**: Any token NOT on the list above. Small caps, new memecoins without Hyperliquid pairs.
    
    **TRADING FOCUS**: 
    - Prioritize LARGE CAP and MID CAP tokens for safer trading
    - Look for BOTH long AND short opportunities
    - In bearish conditions, SHORTS can be more profitable than forcing longs
    
    1. **Analyze the provided market data** (Trending Coins and Top Gainers/Losers).
    2. **Research & Verify (Using your built-in capabilities)**:
       - **Search X (Twitter) and the Web** directly to check for recent news, sentiment.
       - Verify if the price movement is backed by a real narrative or just noise.
    3. Select the best candidates for LONG or SHORT:
       
       🟢 **LONG Candidates**:
       - Strong upward momentum with volume confirmation
       - Positive catalysts, partnerships, upgrades
       - Bullish breakouts from consolidation
       - Bouncing from major support levels
       
       🔴 **SHORT Candidates**:
       - Strong downward momentum, breaking support
       - Negative news, hacks, regulatory concerns, team drama
       - Failed breakouts, rejection from resistance
       - Bearish market structure, lower highs/lower lows
       - Overextended pumps without fundamental backing
       
    4. Return a list of potential candidates with:
       - **direction**: "LONG" or "SHORT"
       - Brief reason including the narrative found
    
    **Goal**: Find high-quality setups in EITHER direction. Be selective.
    - If the overall market is bearish, lean toward SHORT setups
    - If the overall market is bullish, lean toward LONG setups
    - In choppy/sideways markets, be extra selective or return fewer candidates
    - If no good setups exist, return an empty list

    **Mode 2: Single Token Deep Dive**
    If asked to scan a SPECIFIC token (e.g. "Scan $SOL"), return an 'analysis' object instead of 'candidates'.
    Include:
    - symbol, name, address
    - current_price_usd, market_cap, volume_24h
    - price_action (1h, 24h, 7d changes)
    - top_narratives (array of strings)
    - suggested_direction ("LONG", "SHORT", or "NEUTRAL")
    - price_driver_summary (string)

    IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.

    Example JSON Output (Mode 1):
    {
      "candidates": [
        {
          "symbol": "SOL",
          "name": "Solana",
          "coingecko_id": "solana",
          "chain": "solana",
          "address": "So11111111111111111111111111111111111111112",
          "direction": "LONG",
          "reason": "Breaking out of consolidation, new DeFi TVL ATH. X confirms ecosystem growth narrative."
        },
        {
          "symbol": "DOGE",
          "name": "Dogecoin",
          "coingecko_id": "dogecoin",
          "chain": "bitcoin",
          "address": null,
          "direction": "SHORT",
          "reason": "Rejected at $0.45 resistance 3 times. Elon went quiet. Lower highs forming. Memecoin season cooling."
        }
      ]
    }

    Example JSON Output (Mode 2):
    {
      "analysis": {
        "symbol": "SOL",
        "name": "Solana",
        "current_price_usd": 25.50,
        "market_cap": 10000000000,
        "volume_24h": 500000000,
        "price_action": { "1h_change": "+1%", "24h_change": "+5%", "7d_change": "+10%" },
        "top_narratives": ["New partnership", "Network upgrade"],
        "suggested_direction": "LONG",
        "price_driver_summary": "Strong momentum due to..."
      }
    }
  `)
  .withOutputSchema(
    z.object({
      candidates: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          coingecko_id: z.string().nullable().optional(),
          chain: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          direction: z.enum(['LONG', 'SHORT']).optional().describe('Trading direction: LONG or SHORT'),
          reason: z.string(),
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
