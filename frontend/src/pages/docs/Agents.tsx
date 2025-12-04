import { DocsLayout } from '../../components/layout/DocsLayout';

export default function Agents() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Agent Reference
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                Detailed documentation for each specialized agent in the Rogue system. Each agent is optimized for a specific task and built using the @iqai/adk framework.
            </p>
        </div>

        <section className="mb-16" id="scanner">
            <h2 className="text-3xl font-bold text-white mb-6">Scanner Agent</h2>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-blue-200 text-sm">
                    <strong>Role:</strong> First-line detection of market anomalies using <strong>Bias-First Methodology</strong> — determines LONG/SHORT/NEUTRAL market bias before finding matching opportunities
                </p>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Bias-First Methodology</h3>
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6 mb-6">
                <p className="text-cyan-200 text-sm mb-4">
                    <strong>NEW:</strong> Instead of blindly scanning all tokens, the Scanner first determines the overall market bias for the trading session, then finds tokens that align with that bias.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <h5 className="text-green-400 font-bold text-sm mb-1">📈 LONG Bias</h5>
                        <p className="text-xs text-gray-400">BTC bullish, positive funding, risk-on sentiment → Find breakout & accumulation setups</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <h5 className="text-red-400 font-bold text-sm mb-1">📉 SHORT Bias</h5>
                        <p className="text-xs text-gray-400">BTC weakness, negative funding, risk-off → Find rejection & distribution setups</p>
                    </div>
                    <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3">
                        <h5 className="text-gray-400 font-bold text-sm mb-1">⏸️ NEUTRAL</h5>
                        <p className="text-xs text-gray-400">Conflicting signals, choppy conditions → No trading, wait for clarity</p>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Bias Determination Process</h3>
            <div className="space-y-3 mb-6">
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                    <div>
                        <p className="text-white font-medium">Analyze BTC Context</p>
                        <p className="text-gray-400 text-sm">4H trend direction, key support/resistance levels, recent price action</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                    <div>
                        <p className="text-white font-medium">Check Funding Rates</p>
                        <p className="text-gray-400 text-sm">Positive funding = crowded longs (fade), negative = potential bounce</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                    <div>
                        <p className="text-white font-medium">Sentiment Scan</p>
                        <p className="text-gray-400 text-sm">X/Twitter mood, news catalysts, Fear & Greed Index context</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">4</span>
                    <div>
                        <p className="text-white font-medium">Commit to Bias</p>
                        <p className="text-gray-400 text-sm">Only search for tokens that align with the determined bias direction</p>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Data Sources</h3>
            <ul className="list-none space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-3"><span className="text-cyan-400 font-bold">★</span><strong className="text-white">Binance Futures OHLCV (Primary)</strong> — Institutional-grade candlestick data from USDT-M Perpetuals</li>
                <li className="flex items-start gap-3"><span className="text-cyan-400 font-bold">★</span><strong className="text-white">122 Unified Tradeable Tokens</strong> — Verified on BOTH Binance Futures AND Hyperliquid</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>CoinGecko trending coins (top 15)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Birdeye trending tokens (top 10, real-time DEX data)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Top gainers/losers (24h price changes)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>DeFi Llama TVL shifts (chain and protocol level)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Bitcoin market context (global sentiment indicator)</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mb-4">Unified Tradeable Tokens</h3>
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6 mb-6">
                <p className="text-cyan-200 text-sm mb-4">
                    <strong>NEW:</strong> Scanner only recommends tokens from the <strong>122 unified tradeable tokens list</strong> — tokens verified available on BOTH Binance Futures (for chart data) AND Hyperliquid (for execution).
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-cyan-400 font-bold">Major (17)</span>
                        <p className="text-gray-400">BTC, ETH, SOL, BNB, XRP...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-blue-400 font-bold">Layer 2 (18)</span>
                        <p className="text-gray-400">ARB, OP, ZK, NEAR, STRK...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-green-400 font-bold">DeFi (19)</span>
                        <p className="text-gray-400">AAVE, UNI, PENDLE, JUP...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-purple-400 font-bold">Gaming (13)</span>
                        <p className="text-gray-400">IMX, GALA, SAND, AXS...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-pink-400 font-bold">AI (10)</span>
                        <p className="text-gray-400">FET, TAO, IO, WLD...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-orange-400 font-bold">Meme (15)</span>
                        <p className="text-gray-400">PEPE, SHIB, WIF, BONK...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-yellow-400 font-bold">Ecosystem (18)</span>
                        <p className="text-gray-400">SUI, TIA, APT, BERA...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-400 font-bold">Other (12)</span>
                        <p className="text-gray-400">ORDI, BLUR, ENS, OM...</p>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Intelligence</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <ul className="space-y-3 text-gray-300 list-none">
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow text-xl">→</span>
                        <span><strong className="text-white">Bias-aligned filtering</strong> — Only returns tokens matching the day's directional bias</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow text-xl">→</span>
                        <span>Uses <strong className="text-white">real-time X (Twitter) and web search</strong> to validate each candidate</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow text-xl">→</span>
                        <span>Filters out noise by requiring actual narratives, not just price pumps</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow text-xl">→</span>
                        <span>Avoids stablecoins, wrapped tokens, and obvious scams</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow text-xl">→</span>
                        <span><strong className="text-white">Max 3 candidates</strong> — Quality over quantity, only the best setups</span>
                    </li>
                </ul>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Output</h3>
            <p className="text-gray-300 mb-4">Returns market bias determination and up to 3 high-quality candidates that align with that bias.</p>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-4 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-300">{`{
  "market_bias": "SHORT",
  "bias_reasoning": "BTC rejected at $68k resistance with bearish 4H close. Funding rates elevated (+0.03%). Risk-off sentiment after hawkish Fed comments.",
  "candidates": [
    {
      "symbol": "SOL",
      "name": "Solana",
      "coingecko_id": "solana",
      "chain": "solana",
      "address": "So11111111111111111111111111111111111111112",
      "direction": "SHORT",
      "reason": "Distribution pattern at $150 resistance. CVD divergence (price flat, volume declining). Aligns with bearish market bias."
    }
  ]
}`}</pre>
            </div>
        </section>

        <section className="mb-16" id="analyzer">
            <h2 className="text-3xl font-bold text-white mb-6">Analyzer Agent</h2>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <p className="text-green-200 text-sm">
                    <strong>Role:</strong> Elite Day Trading Engine - Transforms raw candidates into actionable signals with focus on <strong>day trades</strong> (4-24h) and selective <strong>swing trades</strong> (2-5 days)
                </p>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Trading Philosophy</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-r from-teal-500/10 to-green-500/10 border border-teal-500/30 rounded-lg p-4">
                    <h4 className="text-teal-400 font-bold mb-2">🎯 Primary: Day Trades</h4>
                    <p className="text-sm text-gray-300">4-24 hour holds</p>
                    <p className="text-xs text-gray-400 mt-1">Clear intraday momentum, volume spikes, news catalysts</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-400 font-bold mb-2">📈 Secondary: Swing Trades</h4>
                    <p className="text-sm text-gray-300">2-5 day holds</p>
                    <p className="text-xs text-gray-400 mt-1">Strong multi-day trends, major catalysts, MTF alignment &gt;85%</p>
                </div>
                <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-red-400 font-bold mb-2">❌ Avoided: Scalping</h4>
                    <p className="text-sm text-gray-300">&lt;2 hour holds</p>
                    <p className="text-xs text-gray-400 mt-1">Too risky, noise-prone, tight stops get hunted</p>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Stop-Loss Rules (Non-Negotiable)</h3>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
                <ul className="space-y-3 text-gray-300 list-none">
                    <li className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">⚠️</span>
                        <span><strong className="text-white">Minimum:</strong> 4% from entry (NEVER tighter - avoids getting stopped on noise)</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✅</span>
                        <span><strong className="text-white">Preferred:</strong> 5-8% based on ATR for day trades</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-blue-400 text-xl">📈</span>
                        <span><strong className="text-white">Swing Trades:</strong> 8-12% stop-loss distance</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-purple-400 text-xl">📍</span>
                        <span><strong className="text-white">Structural:</strong> Stops placed at order blocks, VAL, swing lows (not arbitrary %)</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-red-400 text-xl">❌</span>
                        <span><strong className="text-white">Rule:</strong> If structural level requires &lt;4% stop → SKIP THE TRADE</span>
                    </li>
                </ul>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Risk/Reward Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">🎯 Day Trade R:R</h4>
                    <p className="text-sm text-gray-300">Minimum: <span className="text-teal-400 font-bold">1:2</span></p>
                    <p className="text-sm text-gray-300">Preferred: <span className="text-green-400 font-bold">1:2.5 to 1:3</span></p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">📈 Swing Trade R:R</h4>
                    <p className="text-sm text-gray-300">Minimum: <span className="text-teal-400 font-bold">1:2.5</span></p>
                    <p className="text-sm text-gray-300">Preferred: <span className="text-green-400 font-bold">1:3 to 1:4</span></p>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Analysis Framework</h3>
            
            <div className="space-y-6 mb-8">
                <div>
                    <h4 className="text-lg font-bold text-white mb-3">1. Duplicate Prevention</h4>
                    <p className="text-gray-300">Checks database for recent signals on the same token (48h window)</p>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-white mb-3">2. Price Intelligence</h4>
                    <p className="text-gray-300 mb-2">Fetches current price using chain + contract address for accuracy. Supports multi-chain lookup:</p>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-purple-300 text-sm">Solana</span>
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-sm">Ethereum</span>
                        <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">Base</span>
                        <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-300 text-sm">Arbitrum</span>
                        <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-orange-300 text-sm">Polygon</span>
                    </div>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-white mb-3">3. Advanced Technical Analysis (2025 Meta Indicators)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">CVD (Cumulative Volume Delta)</h5>
                            <p className="text-xs text-gray-400">Orderflow analysis detecting whale accumulation and divergences</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">ICT Order Blocks & FVG</h5>
                            <p className="text-xs text-gray-400">Institutional zones where smart money operates</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">Volume Profile (VPFR)</h5>
                            <p className="text-xs text-gray-400">High-volume nodes identify key support/resistance</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">Heikin-Ashi + SuperTrend</h5>
                            <p className="text-xs text-gray-400">Clean trend filtering, reduces whipsaws by 65%</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">BB Squeeze + Keltner</h5>
                            <p className="text-xs text-gray-400">Pre-breakout volatility compression detection</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">Volume-Weighted MACD</h5>
                            <p className="text-xs text-gray-400">Enhanced accuracy on low-liquidity L2 chains</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">Fibonacci Levels</h5>
                            <p className="text-xs text-gray-400">Precision retracement/extension zones</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2 text-sm">MTF Alignment Score</h5>
                            <p className="text-xs text-gray-400">Confluence across multiple timeframes (89-97% accuracy)</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-white mb-3">4. Fundamental Analysis</h4>
                    <ul className="list-none space-y-2 text-gray-300">
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Market Cap and FDV (Fully Diluted Valuation) ratios</li>
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>24h trading volume (minimum thresholds)</li>
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Token holder distribution</li>
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Smart contract verification status</li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-white mb-3">5. Sentiment Analysis</h4>
                    <p className="text-gray-300 mb-2">Via Tavily AI Search:</p>
                    <ul className="list-none space-y-2 text-gray-300">
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Recent news aggregation</li>
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Community sentiment scoring</li>
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Partnership/integration announcements</li>
                        <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Social media trending strength</li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-white mb-3">6. Vision-Based Chart Analysis (Two-Stage Pipeline)</h4>
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-purple-200 text-sm mb-3">
                            <strong>NEW:</strong> AI-powered visual chart analysis using a dedicated Vision LLM Service. Charts are generated, sent to a vision-capable model for analysis, and the textual insights are passed to the Analyzer Agent.
                        </p>
                        
                        <div className="bg-white/5 rounded-lg p-4 mb-4">
                            <h5 className="text-cyan-300 font-semibold mb-3 text-sm">🔄 Vision Analysis Flow</h5>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Scanner finds 3 candidates</span>
                                <span className="text-gray-500">→</span>
                                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Generate PNG charts</span>
                                <span className="text-gray-500">→</span>
                                <span className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded">Vision LLM analyzes images</span>
                                <span className="text-gray-500">→</span>
                                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">Text analysis to Analyzer</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-white/5 rounded p-3">
                                <h5 className="text-purple-300 font-semibold mb-2 text-sm">📊 Stage 1: Chart Generation</h5>
                                <ul className="text-xs text-gray-400 space-y-1">
                                    <li>• Real candlesticks with wicks and colored bodies</li>
                                    <li>• SMA 20 (blue) & SMA 50 (yellow) trend lines</li>
                                    <li>• Bollinger Bands with semi-transparent fill</li>
                                    <li>• Color-coded volume bars (green/red)</li>
                                    <li>• 1800x1000 PNG, dark theme (#131722)</li>
                                </ul>
                            </div>
                            <div className="bg-white/5 rounded p-3">
                                <h5 className="text-cyan-300 font-semibold mb-2 text-sm">🤖 Stage 2: Vision LLM Analysis</h5>
                                <ul className="text-xs text-gray-400 space-y-1">
                                    <li>• Direct API call to vision-capable LLM</li>
                                    <li>• Analyzes: trends, S/R, patterns, MA positions</li>
                                    <li>• Returns 150-200 word textual analysis</li>
                                    <li>• Bypasses AI SDK for proper image handling</li>
                                    <li>• Analysis embedded in Analyzer prompt</li>
                                </ul>
                            </div>
                        </div>
                        <ul className="list-none space-y-2 text-gray-300">
                            <li className="flex items-start gap-3"><span className="text-purple-400">📊</span>Real Binance Futures candlestick data for 122 unified tokens</li>
                            <li className="flex items-start gap-3"><span className="text-purple-400">🔍</span>Visual pattern recognition (head & shoulders, wedges, channels)</li>
                            <li className="flex items-start gap-3"><span className="text-purple-400">📈</span>Trend direction and momentum assessment from actual charts</li>
                            <li className="flex items-start gap-3"><span className="text-purple-400">✅</span>Combines numerical TA with visual confirmation for higher accuracy</li>
                        </ul>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Signal Tiers</h3>
            <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-bold mb-2">🔥 TIER 1 SETUPS (Confidence 92-100%)</h4>
                    <p className="text-gray-300 text-sm mb-2">Requires 5+ advanced confluences + proper R:R:</p>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• CVD divergence + MTF alignment (4+ TFs) + BB Squeeze breakout</li>
                        <li>• Strong catalyst + Volume Profile POC support + SuperTrend bullish</li>
                        <li>• Structural stop-loss at 5-8% with 1:2.5+ R:R</li>
                    </ul>
                </div>

                <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-lg p-4">
                    <h4 className="text-green-400 font-bold mb-2">✅ TIER 2 SETUPS (Confidence 85-91%) — MINIMUM THRESHOLD</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• <strong className="text-white">2+ advanced confluences</strong> + R:R ≥ 1:2</li>
                        <li>• MTF alignment ≥ 50% across timeframes</li>
                        <li>• Clear structural levels for entry/stop/target</li>
                        <li>• Day trade with clear 4-24h catalyst window</li>
                    </ul>
                </div>

                <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-red-400 font-bold mb-2">❌ REJECTED (Below Quality Gate)</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Confidence below <strong className="text-white">85%</strong></li>
                        <li>• R:R below <strong className="text-white">1:2</strong></li>
                        <li>• MTF alignment below <strong className="text-white">50%</strong></li>
                        <li>• Fewer than <strong className="text-white">2 confluences</strong></li>
                        <li>• Stop-loss would need to be &lt;5% (too tight)</li>
                        <li>• No clear structural levels for stop-loss</li>
                    </ul>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Entry Strategy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">Market Order</h4>
                    <p className="text-sm text-gray-400">Only for immediate momentum plays:</p>
                    <ul className="text-xs text-gray-400 mt-2 space-y-1">
                        <li>• BB squeeze breakout in progress</li>
                        <li>• Strong catalyst just dropped</li>
                    </ul>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">Limit Order (Preferred)</h4>
                    <p className="text-sm text-gray-400">Better R:R at support levels:</p>
                    <ul className="text-xs text-gray-400 mt-2 space-y-1">
                        <li>• Volume Profile POC or VAL</li>
                        <li>• Fib 50% or 61.8% retracement</li>
                        <li>• ICT Order Block zone</li>
                        <li>• SuperTrend level</li>
                    </ul>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Signal Format</h3>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-6 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-300">{`🎯 $ARB day trade
⏱️ 8-16h hold
entry: $0.85
target: $1.02 (+20%)
stop: $0.80 (-5.9%)
r:r: 1:3.4
conf: 89%
cvd divergence + poc support + upgrade catalyst
#arbitrum`}</pre>
            </div>
        </section>

        <section className="mb-16" id="futures-agents">
            <h2 className="text-3xl font-bold text-white mb-6">Futures Agents</h2>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
                <p className="text-cyan-200 text-sm">
                    <strong>Role:</strong> Autonomous Perpetual Trading - AI-powered futures trading on Hyperliquid testnet with LONG and SHORT positions
                </p>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Exchange Integration</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-white font-semibold mb-2">Hyperliquid Testnet</h4>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400">→</span>
                                <span>Fully on-chain perpetual futures DEX</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400">→</span>
                                <span>API: <code className="text-cyan-300">api.hyperliquid-testnet.xyz</code></span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400">→</span>
                                <span>EIP-712 typed data signing for authentication</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-2">Supported Features</h4>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400">→</span>
                                <span><strong className="text-white">Leverage:</strong> Dynamic per asset (BTC: 50x, ETH: 50x, memecoins: 3-5x)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400">→</span>
                                <span><strong className="text-white">Directions:</strong> LONG and SHORT</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400">→</span>
                                <span><strong className="text-white">Order Types:</strong> Market, Limit, Trigger</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Futures Scanner Agent</h3>
            <p className="text-gray-300 mb-4">Extends the base Scanner with directional analysis:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-lg p-4">
                    <h4 className="text-green-400 font-bold mb-2">📈 LONG Opportunities</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Breakout patterns with volume confirmation</li>
                        <li>• Accumulation phases (CVD rising, price flat)</li>
                        <li>• Oversold bounces at key support</li>
                        <li>• Bullish divergences on RSI/MACD</li>
                    </ul>
                </div>
                <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-red-400 font-bold mb-2">📉 SHORT Opportunities</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Rejection patterns at resistance</li>
                        <li>• Distribution phases (CVD falling, price flat)</li>
                        <li>• Overbought reversals at key levels</li>
                        <li>• Bearish divergences on RSI/MACD</li>
                    </ul>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Futures Analyzer Agent</h3>
            <p className="text-gray-300 mb-4">Direction-aware analysis with separate logic for LONG vs SHORT:</p>
            <div className="space-y-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">LONG Position Logic</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li>• <strong className="text-green-400">Entry:</strong> At support levels (POC, order blocks, Fib retracements)</li>
                        <li>• <strong className="text-red-400">Stop-Loss:</strong> Below key support (swing low, demand zone)</li>
                        <li>• <strong className="text-cyan-400">Take-Profit:</strong> At resistance (Fib extensions, supply zones)</li>
                    </ul>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">SHORT Position Logic</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li>• <strong className="text-red-400">Entry:</strong> At resistance levels (supply zones, Fib extensions)</li>
                        <li>• <strong className="text-green-400">Stop-Loss:</strong> Above key resistance (swing high, supply zone)</li>
                        <li>• <strong className="text-cyan-400">Take-Profit:</strong> At support (demand zones, prior lows)</li>
                    </ul>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Order Types</h3>
            <div className="space-y-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">Market Orders</h4>
                    <p className="text-sm text-gray-400">Immediate execution at best available price. Used for momentum breakouts.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2">Limit Orders</h4>
                    <p className="text-sm text-gray-400">Execute only at specified price or better. Preferred for better R:R at key levels.</p>
                </div>
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
                    <h4 className="text-cyan-400 font-bold mb-2">⚡ Trigger Orders (Stop-Loss/Take-Profit)</h4>
                    <p className="text-sm text-gray-300 mb-2">Stop-market orders that remain dormant until the oracle price crosses the trigger price.</p>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• <strong>Why not limit orders for stops?</strong> Limit orders execute immediately if price has crossed - causing instant fills</li>
                        <li>• <strong>Trigger orders wait</strong> for price to cross, then execute as market order</li>
                        <li>• <strong>Time-in-Force:</strong> GTC (Good-Till-Canceled) for persistent orders</li>
                    </ul>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Signal Executor</h3>
            <p className="text-gray-300 mb-4">Executes analyzed signals on Hyperliquid:</p>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-6 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-300">{`// Position Flow
1. Receive signal with direction (LONG/SHORT)
2. Set leverage for the asset
3. Place entry order (market or limit)
4. Set trigger order for stop-loss
5. Monitor position until TP or SL hit

// Example LONG Signal
{
  "direction": "LONG",
  "symbol": "ETH",
  "entry": 2450.00,
  "stopLoss": 2400.00,
  "takeProfit": 2550.00,
  "leverage": 10
}`}</pre>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Security</h3>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">🔒</span>
                        <span>Private keys encrypted with <strong className="text-white">AES-256-GCM</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">🔒</span>
                        <span>Keys stored in database, never logged or exposed in responses</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">🔒</span>
                        <span>Wallet address used for identification (never private key)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">🔒</span>
                        <span><strong className="text-white">Testnet only</strong> for development and testing</span>
                    </li>
                </ul>
            </div>
        </section>

        <section className="mb-16" id="intel">
            <h2 className="text-3xl font-bold text-white mb-6">Intel Agent</h2>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                <p className="text-purple-200 text-sm">
                    <strong>Role:</strong> The Narrative Strategist - Identifies emerging market narratives and macro trends
                </p>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Focus Areas</h3>
            <ul className="list-none space-y-3 mb-6 text-gray-300">
                <li className="flex items-start gap-3">
                    <span className="text-purple-400 text-xl">→</span>
                    <span><strong className="text-white">Sector rotation analysis</strong> (AI, Gaming, DeFi, Layer 2, Memes, etc.)</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-purple-400 text-xl">→</span>
                    <span><strong className="text-white">Capital flow tracking</strong> (TVL movements between chains/protocols)</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-purple-400 text-xl">→</span>
                    <span><strong className="text-white">Social momentum</strong> (viral narratives on X/Twitter)</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-purple-400 text-xl">→</span>
                    <span><strong className="text-white">Macro catalysts</strong> (regulatory news, institutional adoption)</span>
                </li>
            </ul>

            <h3 className="text-2xl font-bold text-white mb-4">High-Signal Sources</h3>
            <p className="text-gray-300 mb-4">The Intel Agent monitors specific high-alpha X accounts:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                {['WatcherGuru', 'agentcookiefun', 'cz_binance', 'brian_armstrong', 'ali_charts', 'CryptoCred', 'Pentosh1', 'JacobCryptoBury', 'VitalikButerin', 'Cointelegraph', 'CryptoCobain', 'danheld'].map(account => (
                    <div key={account} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-gray-300">
                        @{account}
                    </div>
                ))}
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Importance Scoring</h3>
            <div className="space-y-3">
                <div className="flex gap-3">
                    <div className="w-16 text-gray-500 font-mono text-sm">1-5</div>
                    <div className="text-gray-400 text-sm">Noise, standard market moves, generic news</div>
                </div>
                <div className="flex gap-3">
                    <div className="w-16 text-blue-400 font-mono text-sm">6-8</div>
                    <div className="text-gray-300 text-sm">Notable trend, good to know, actionable</div>
                </div>
                <div className="flex gap-3">
                    <div className="w-16 text-yellow-400 font-mono text-sm font-bold">9-10</div>
                    <div className="text-white text-sm font-medium">CRITICAL ALPHA, market-moving, must-read immediately</div>
                </div>
            </div>
        </section>

        <section className="mb-16" id="predictor">
            <h2 className="text-3xl font-bold text-white mb-6">Predictor Agent</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-200 text-sm">
                    <strong>Role:</strong> The Prediction Markets Oracle - Discovers high-edge betting opportunities on Polymarket
                </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">💎</span>
                    <span className="text-yellow-300 font-bold">Diamond Tier Exclusive</span>
                    <span className="text-gray-400 text-sm">- Requires 1,000+ $RGE tokens</span>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Capabilities</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <ul className="space-y-3 text-gray-300 list-none">
                    <li className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">→</span>
                        <span><strong className="text-white">Real-time market discovery</strong> via web search on Polymarket.com</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">→</span>
                        <span><strong className="text-white">X (Twitter) sentiment analysis</strong> for each market</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">→</span>
                        <span><strong className="text-white">Independent probability calculation</strong> vs market implied odds</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">→</span>
                        <span><strong className="text-white">Edge detection</strong> identifying mispriced markets (12%+ edge required)</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-yellow-400 text-xl">→</span>
                        <span><strong className="text-white">URL verification</strong> ensuring all market links are valid</span>
                    </li>
                </ul>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Analysis Process</h3>
            <div className="space-y-3 mb-6">
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-yellow-500/20 text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                    <div>
                        <p className="text-white font-medium">Search Polymarket</p>
                        <p className="text-gray-400 text-sm">Discovers active, high-volume markets across all categories</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-yellow-500/20 text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                    <div>
                        <p className="text-white font-medium">Verify URLs</p>
                        <p className="text-gray-400 text-sm">Confirms each market link exists (no fake/404 links)</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-yellow-500/20 text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                    <div>
                        <p className="text-white font-medium">Get Market Price</p>
                        <p className="text-gray-400 text-sm">Fetches current YES price and calculates implied probability</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-yellow-500/20 text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">4</span>
                    <div>
                        <p className="text-white font-medium">Research Sentiment</p>
                        <p className="text-gray-400 text-sm">Searches X and news for insider signals and sentiment shifts</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="bg-yellow-500/20 text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">5</span>
                    <div>
                        <p className="text-white font-medium">Calculate Edge</p>
                        <p className="text-gray-400 text-sm">Edge = |Rogue Probability - Market Implied Probability| (min 12%)</p>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Categories Covered</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <h4 className="text-orange-400 font-bold text-sm mb-1">🪙 Crypto</h4>
                    <p className="text-xs text-gray-400">BTC/ETH price targets, regulatory events</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <h4 className="text-blue-400 font-bold text-sm mb-1">🏛️ Politics</h4>
                    <p className="text-xs text-gray-400">Elections, policy decisions</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <h4 className="text-green-400 font-bold text-sm mb-1">⚽ Sports</h4>
                    <p className="text-xs text-gray-400">Major championships, player moves</p>
                </div>
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3">
                    <h4 className="text-pink-400 font-bold text-sm mb-1">🎬 Entertainment</h4>
                    <p className="text-xs text-gray-400">Awards, releases, celebrity events</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <h4 className="text-purple-400 font-bold text-sm mb-1">💻 Technology</h4>
                    <p className="text-xs text-gray-400">Product launches, milestones</p>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <h4 className="text-cyan-400 font-bold text-sm mb-1">📊 Economics</h4>
                    <p className="text-xs text-gray-400">Fed decisions, market indicators</p>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Confidence Scoring</h3>
            <div className="space-y-3 mb-6">
                <div className="flex gap-3">
                    <div className="w-20 text-yellow-300 font-mono text-sm font-bold">99</div>
                    <div className="text-white text-sm">Near-certain (leaked info, definitive sources)</div>
                </div>
                <div className="flex gap-3">
                    <div className="w-20 text-green-400 font-mono text-sm">95-98</div>
                    <div className="text-gray-300 text-sm">Very high confidence (strong evidence, clear trend)</div>
                </div>
                <div className="flex gap-3">
                    <div className="w-20 text-blue-400 font-mono text-sm">92-94</div>
                    <div className="text-gray-300 text-sm">High confidence (solid analysis, some uncertainty)</div>
                </div>
                <div className="flex gap-3">
                    <div className="w-20 text-gray-400 font-mono text-sm">90-91</div>
                    <div className="text-gray-400 text-sm">Moderate confidence (edge exists but riskier)</div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Output Format</h3>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-6 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-300">{`{
  "market_id": "will-btc-hit-100k-2025",
  "title": "Will Bitcoin hit $100,000 in 2025?",
  "platform": "Polymarket",
  "category": "Crypto",
  "yes_price": 0.72,
  "implied_probability": 72,
  "rogue_probability": 88,
  "edge_percent": 16,
  "confidence_score": 94,
  "recommended_bet": "BUY YES",
  "market_url": "https://polymarket.com/event/will-btc-hit-100k-2025",
  "reasoning": "ETF inflows and halving cycle momentum underpriced; X sentiment bullish."
}`}</pre>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Schedule</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-gray-300">
                    <strong className="text-white">Scan Interval:</strong> Every 6 hours
                </p>
                <p className="text-gray-400 text-sm mt-2">
                    Results are cached in the database for instant access. Diamond tier users can also trigger manual scans.
                </p>
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
