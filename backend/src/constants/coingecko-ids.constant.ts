/**
 * Mapping of token symbols to their CoinGecko IDs
 * Used to normalize coingecko_id for price tracking in signal monitoring
 * 
 * This mapping covers ONLY tokens tradeable on Hyperliquid perpetuals (164 symbols)
 * Last verified: November 28, 2025 from Hyperliquid testnet API
 */

export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Major coins (available on Hyperliquid)
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOGE': 'dogecoin',
  'ETC': 'ethereum-classic',
  'ATOM': 'cosmos',
  'AAVE': 'aave',
  'SNX': 'havven',
  'COMP': 'compound-governance-token',

  // Layer 2 & Infrastructure
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'POL': 'matic-network',
  'MANTA': 'manta-network',
  'LINEA': 'linea',
  'BLAST': 'blast',
  'ZK': 'zksync',
  'ZETA': 'zetachain',
  'CELO': 'celo',
  'NEAR': 'near',
  'ICP': 'internet-computer',
  'FIL': 'filecoin',
  'AR': 'arweave',
  'RENDER': 'render-token',

  // DeFi
  'DYDX': 'dydx-chain',
  'LDO': 'lido-dao',
  'FXS': 'frax-share',
  'PENDLE': 'pendle',
  'EIGEN': 'eigenlayer',
  'ONDO': 'ondo-finance',
  'MORPHO': 'morpho',
  'USUAL': 'usual',
  'RESOLV': 'resolv',
  'AERO': 'aerodrome-finance',
  'CAKE': 'pancakeswap-token',
  'SUSHI': 'sushi',
  'RSR': 'reserve-rights-token',

  // Gaming & Metaverse
  'IMX': 'immutable-x',
  'GALA': 'gala',
  'SAND': 'the-sandbox',
  'APE': 'apecoin',
  'BIGTIME': 'bigtime',
  'SUPER': 'superfarm',
  'MAVIA': 'heroes-of-mavia',
  'XAI': 'xai-games',
  'ACE': 'fusionist',

  // AI & Data
  'FET': 'fetch-ai',
  'TAO': 'bittensor',
  'IO': 'io-net',
  'GRASS': 'grass',
  'AIXBT': 'aixbt',
  'VIRTUAL': 'virtual-protocol',
  'GRIFFAIN': 'griffain',
  'PROMPT': 'wayfinder',
  'KAITO': 'kaito',

  // Meme coins
  'WIF': 'dogwifcoin',
  'POPCAT': 'popcat',
  'BRETT': 'brett',
  'GOAT': 'goatseus-maximus',
  'PNUT': 'peanut-the-squirrel',
  'MOODENG': 'moo-deng',
  'FARTCOIN': 'fartcoin',
  'ZEREBRO': 'zerebro',
  'TURBO': 'turbo',
  'MEME': 'memecoin-2',
  'MEW': 'cat-in-a-dogs-world',
  'CHILLGUY': 'chill-guy',
  'DOOD': 'doodles',
  'SPX': 'spx6900',
  'PURR': 'purr-2',
  // k-prefixed tokens (smaller denomination versions)
  'kBONK': 'bonk',
  'kLUNC': 'terra-luna',
  'kNEIRO': 'neiro-3',
  'kPEPE': 'pepe',
  'kSHIB': 'shiba-inu',

  // Political & Social
  'TRUMP': 'official-trump',
  'MELANIA': 'melania-meme',
  'PEOPLE': 'constitutiondao',
  'VINE': 'vine-coin',
  'WLFI': 'world-liberty-financial',

  // New ecosystems
  'SUI': 'sui',
  'TIA': 'celestia',
  'APT': 'aptos',
  'INJ': 'injective-protocol',
  'PYTH': 'pyth-network',
  'JTO': 'jito-governance-token',
  'JUP': 'jupiter-exchange-solana',
  'W': 'wormhole',
  'DYM': 'dymension',
  'ALT': 'altlayer',
  'BERA': 'berachain-bera',
  'INIT': 'initia',
  'HYPE': 'hyperliquid',
  'HYPER': 'hyperliquid',
  'IP': 'story-2',
  'MOVE': 'movement',
  'LAYER': 'layer-ai',
  'S': 'sonic-3',
  'ANIME': 'animecoin',
  'MON': 'monad',
  'BABY': 'baby',
  'PUMP': 'pump',

  // Infrastructure & Utilities
  'STX': 'blockstack',
  'KAS': 'kaspa',
  'TON': 'the-open-network',
  'XLM': 'stellar',
  'ALGO': 'algorand',
  'HBAR': 'hedera-hashgraph',
  'NEO': 'neo',
  'BSV': 'bitcoin-cash-sv',
  'ORDI': 'ordinals',
  'WLD': 'worldcoin-wld',
  'BLUR': 'blur',
  'ENS': 'ethereum-name-service',
  'GAS': 'gas',
  'APEX': 'apex-token-2',

  // Others
  'RUNE': 'thorchain',
  'NOT': 'notcoin',
  'HMSTR': 'hamster-kombat',
  'OM': 'mantra-dao',
  'SAGA': 'saga-2',
  'TNSR': 'tensor',
  'REZ': 'renzo',
  'MERL': 'merlin-chain',
  'BIO': 'bio-protocol',
  'PENGU': 'pudgy-penguins',
  'ME': 'magic-eden',
  'PAXG': 'pax-gold',
  'GMT': 'stepn',
  'BANANA': 'apeswap-finance',
  'MAV': 'maverick-protocol',
  'TRB': 'tellor',
  'UMA': 'uma',
  'IOTA': 'iota',
  'MINA': 'mina-protocol',
  'USTC': 'terrausd',
  'FTT': 'ftx-token',
  'ZEN': 'horizen',
  'POLYX': 'polymesh',
  'CC': 'canton-network',

  // Newer additions (Nov 2025)
  'MEGA': 'mega-dice',
  '0G': 'og',
  '2Z': 'toadzcoins',
  'ASTER': 'aster-protocol',
  'AVNT': 'avant-network',
  'HEMI': 'hemi',
  'MET': 'metars-genesis',
  'NIL': 'nil',
  'NXPC': 'nxpc',
  'PROVE': 'provenance-blockchain',
  'SCR': 'scroll',
  'SKY': 'sky',
  'SOPH': 'sophiaverse',
  'STBL': 'hyperstable',
  'SYRUP': 'maple',
  'TST': 'tst',
  'VVV': 'venice-token',
  'WCT': 'walletconnect',
  'XPL': 'pulse',
  'YZY': 'yeay',
  'ZORA': 'zora',
  'ZRO': 'layerzero',
};

/**
 * Get the CoinGecko ID for a given symbol
 * Falls back to lowercase symbol if no mapping exists
 */
export function getCoingeckoId(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().replace(/USDT$/, '').replace(/-PERP$/, '');
  return SYMBOL_TO_COINGECKO_ID[upperSymbol] || symbol.toLowerCase();
}

/**
 * Check if we have a known CoinGecko mapping for a symbol
 */
export function hasCoingeckoMapping(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase().replace(/USDT$/, '').replace(/-PERP$/, '');
  return upperSymbol in SYMBOL_TO_COINGECKO_ID;
}
