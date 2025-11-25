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
                    <strong>Role:</strong> First-line detection of market anomalies and trending opportunities
                </p>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Data Sources</h3>
            <ul className="list-none space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>CoinGecko trending coins (top 15)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Birdeye trending tokens (top 10, real-time DEX data)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Top gainers (24h price changes)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>DeFi Llama TVL shifts (chain and protocol level)</li>
                <li className="flex items-start gap-3"><span className="text-teal-glow">•</span>Bitcoin market context (global sentiment indicator)</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mb-4">Intelligence</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <ul className="space-y-3 text-gray-300 list-none">
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
                        <span>Prioritizes mid-caps and low-caps with high volume</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow text-xl">→</span>
                        <span>Returns detailed candidate profiles including chain, contract address, and reasoning</span>
                    </li>
                </ul>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Output</h3>
            <p className="text-gray-300 mb-4">Returns 3-5 high-quality candidates with narrative context, or empty list if market conditions are poor.</p>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-4 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-300">{`{
  "candidates": [
    {
      "symbol": "BONK",
      "name": "Bonk",
      "coingecko_id": "bonk",
      "chain": "solana",
      "address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "reason": "Trending on Birdeye, 20% gain in 24h. X search confirms new exchange listing rumor."
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
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Signal Tiers</h3>
            <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-bold mb-2">🔥 TIER 1 SETUPS (Confidence 92-100%)</h4>
                    <p className="text-gray-300 text-sm mb-2">Requires 5+ advanced confluences + proper R:R:</p>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• CVD divergence + MTF alignment (4+ TFs) + BB Squeeze breakout</li>
                        <li>• Strong catalyst + Volume Profile POC support + SuperTrend bullish</li>
                        <li>• Structural stop-loss at 5-8% with 1:3+ R:R</li>
                    </ul>
                </div>

                <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-lg p-4">
                    <h4 className="text-green-400 font-bold mb-2">✅ TIER 2 SETUPS (Confidence 85-91%)</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• 3-4 advanced confluences + proper R:R</li>
                        <li>• Strong narrative + 2 technical confluences</li>
                        <li>• Day trade with clear 4-24h catalyst window</li>
                    </ul>
                </div>

                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-400 font-bold mb-2">⚠️ TIER 3 SETUPS (Confidence 80-84%)</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• 2-3 confluences + solid fundamentals</li>
                        <li>• Clear structural levels for entry/stop/target</li>
                        <li>• ONLY taken if R:R is 1:2.5 or better</li>
                    </ul>
                </div>

                <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-red-400 font-bold mb-2">❌ REJECTED</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Confidence below 80%</li>
                        <li>• Stop-loss would need to be &lt;4% (too tight)</li>
                        <li>• R:R below 1:2</li>
                        <li>• No clear structural levels for stop-loss</li>
                        <li>• Bearish market without independent catalyst</li>
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
      </div>
    </DocsLayout>
  );
}
