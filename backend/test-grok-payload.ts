import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_KEY = process.env.SCANNER_API_KEY;
const BASE_URL = process.env.SCANNER_BASE_URL;
const MODEL = 'grok-4-fast';

const marketData = {
  trending_coingecko: [
    { name: "Bitcoin", symbol: "BTC", rank: 1 },
    { name: "Firo", symbol: "FIRO", rank: 615 },
    { name: "Tensor", symbol: "TNSR", rank: 742 },
    { name: "Zcash", symbol: "ZEC", rank: 16 },
    { name: "Grass", symbol: "GRASS", rank: 270 },
    { name: "Edel", symbol: "EDEL", rank: 657 },
    { name: "Starknet", symbol: "STRK", rank: 99 },
    { name: "Pudgy Penguins", symbol: "PENGU", rank: 121 },
    { name: "Bittensor", symbol: "TAO", rank: 48 },
    { name: "Ethereum", symbol: "ETH", rank: 2 },
    { name: "Nillion", symbol: "NIL", rank: 941 },
    { name: "Cosmos Hub", symbol: "ATOM", rank: 76 },
    { name: "Internet Computer", symbol: "ICP", rank: 50 },
    { name: "Artificial Superintelligence Alliance", symbol: "FET", rank: 116 },
    { name: "Hyperliquid", symbol: "HYPE", rank: 18 }
  ],
  trending_birdeye: [
    { name: "OFFICIAL TRUMP", symbol: "TRUMP", rank: 1, volume24h: 66507691.17 },
    { name: "USELESS COIN", symbol: "USELESS", rank: 2, volume24h: 15134873.32 },
    { name: "Pump", symbol: "PUMP", rank: 3, volume24h: 24387524.40 },
    { name: "$Ziggy", symbol: "ZIGGY", rank: 4, volume24h: 42339141.74 },
    { name: "ZEC", symbol: "Zcash", rank: 5, volume24h: 7391204.79 },
    { name: "The Epstein Files", symbol: "EPSTEIN", rank: 6, volume24h: 31815718.60 },
    { name: "Wrapped Ether (Wormhole)", symbol: "WETH", rank: 7, volume24h: 90334245.40 },
    { name: "Jupiter", symbol: "JUP", rank: 8, volume24h: 13234613.00 },
    { name: "Metya", symbol: "MY", rank: 9, volume24h: 27456702.00 },
    { name: "Ziggy", symbol: "ZIGGY", rank: 10, volume24h: 7355440.02 }
  ],
  top_gainers: [
    { name: "Bitcoin", symbol: "btc", change_24h: -0.04698 },
    { name: "Ethereum", symbol: "eth", change_24h: -2.82231 },
    { name: "Tether", symbol: "usdt", change_24h: -0.02088 },
    { name: "XRP", symbol: "xrp", change_24h: -1.23137 },
    { name: "BNB", symbol: "bnb", change_24h: -2.48604 },
    { name: "Solana", symbol: "sol", change_24h: 1.74247 },
    { name: "USDC", symbol: "usdc", change_24h: 0.00008 },
    { name: "TRON", symbol: "trx", change_24h: -0.60729 },
    { name: "Lido Staked Ether", symbol: "steth", change_24h: -2.72729 },
    { name: "Dogecoin", symbol: "doge", change_24h: -0.64128 },
    { name: "Cardano", symbol: "ada", change_24h: -0.27323 },
    { name: "Figure Heloc", symbol: "figr_heloc", change_24h: 0.26587 },
    { name: "WhiteBIT Coin", symbol: "wbt", change_24h: -1.12383 },
    { name: "Wrapped stETH", symbol: "wsteth", change_24h: -2.85528 },
    { name: "Wrapped Bitcoin", symbol: "wbtc", change_24h: 0.05927 }
  ]
};

const systemPrompt = `You are a crypto market scanner powered by Grok. Your job is to identify potential tokens for trading signals based on the provided market data.

1. **Analyze the provided market data** (Trending Coins and Top Gainers).
2. **Research & Verify (Using your built-in capabilities)**:
   - **Search X (Twitter) and the Web** directly to check for recent news, partnerships, or community sentiment for the top candidates.
   - Verify if the price movement is backed by a real narrative or just noise.
3. Select the best candidates.
   - **Prioritize**: Mid Caps and Low Caps with high volume and ACTIVE narratives.
   - **Include**: Large Caps if they are trending strongly with news.
   - **Look for**: Positive momentum OR interesting consolidation patterns.
   - **Avoid**: Stablecoins (USDT, USDC, etc.) and wrapped tokens (WETH, WBTC).
4. Return a list of potential candidates with brief reasons including the narrative found.

**Goal**: Find at least 1-3 good candidates. Do not be too restrictive. If no perfect setups exist, return the most promising trending tokens.

IMPORTANT: You must return the result in strict JSON format matching the output schema. Do not include any conversational text.

Example JSON Output:
{
  "candidates": [
    {
      "symbol": "BONK",
      "name": "Bonk",
      "coingecko_id": "bonk",
      "reason": "Trending on Birdeye, 20% gain in 24h. X search confirms new exchange listing rumor."
    }
  ]
}`;

const userPrompt = `Scan the market for top trending tokens. Here is the current market data:\n${JSON.stringify(marketData, null, 2)}`;

console.log('Testing Grok API with Payload...');

async function test() {
  try {
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.response ? error.response.data : error.message);
    console.error('Status:', error.response ? error.response.status : 'Unknown');
  }
}

test();
