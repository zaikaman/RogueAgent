import { DocsLayout } from '../../components/layout/DocsLayout';

export default function Telegram() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Telegram Bot
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                Connect with Rogue via Telegram for instant signal alerts, voice chat, and custom token analysis. Join <a href="https://t.me/rogueadkbot" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">@rogueadkbot</a> to get started.
            </p>
        </div>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Getting Started</h2>
            
            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">1</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-2">Start the Bot</h3>
                        <p className="text-gray-400">Open Telegram and search for <a href="https://t.me/rogueadkbot" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">@rogueadkbot</a>, then click Start.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">2</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-2">Verify Your Wallet</h3>
                        <p className="text-gray-400 mb-2">Connect your wallet to unlock tier benefits:</p>
                        <div className="bg-[#0d1117] rounded p-3 font-mono text-sm">
                            /verify 0x1234567890abcdef...
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">3</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-2">Start Receiving Signals</h3>
                        <p className="text-gray-400">You'll automatically receive signals based on your tier. No further setup required!</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Available Commands</h2>

            <div className="space-y-4">
                {/* /start */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <code className="text-teal-glow font-mono text-lg">/start</code>
                        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-300 text-xs rounded">All Tiers</span>
                    </div>
                    <p className="text-gray-300 mb-3">Display welcome message and available commands.</p>
                    <div className="bg-[#0d1117] rounded p-3 font-mono text-xs text-gray-400">
                        /start
                    </div>
                </div>

                {/* /verify */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <code className="text-teal-glow font-mono text-lg">/verify</code>
                        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-300 text-xs rounded">All Tiers</span>
                    </div>
                    <p className="text-gray-300 mb-3">Verify your wallet and determine tier based on $RGE holdings.</p>
                    <div className="bg-[#0d1117] rounded p-3 font-mono text-xs">
                        <div className="text-gray-500"># Usage</div>
                        <div className="text-white">/verify &lt;wallet_address&gt;</div>
                        <div className="text-gray-500 mt-2"># Example</div>
                        <div className="text-white">/verify 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7</div>
                    </div>
                    <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded p-3">
                        <p className="text-blue-200 text-sm">
                            <strong>💡 Tip:</strong> Run this command after buying more $RGE to upgrade your tier.
                        </p>
                    </div>
                </div>

                {/* /scan */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <code className="text-teal-glow font-mono text-lg">/scan</code>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">💎 Diamond Only</span>
                    </div>
                    <p className="text-gray-300 mb-3">Request custom analysis of any token. Full agent swarm execution with personalized results.</p>
                    <div className="bg-[#0d1117] rounded p-3 font-mono text-xs">
                        <div className="text-gray-500"># By Symbol</div>
                        <div className="text-white">/scan SOL</div>
                        <div className="text-gray-500 mt-2"># By Contract Address</div>
                        <div className="text-white">/scan 0x6982508145454Ce325dDbE47a25d4ec3d2311933</div>
                    </div>
                    <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded p-3">
                        <p className="text-orange-200 text-sm">
                            <strong>⚠️ Restricted:</strong> Requires 1,000+ $RGE tokens (Diamond tier).
                        </p>
                    </div>
                </div>

                {/* Chat */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <code className="text-teal-glow font-mono text-lg">Chat (Natural Language)</code>
                        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-300 text-xs rounded">All Tiers</span>
                    </div>
                    <p className="text-gray-300 mb-3">Just type a message to chat with Rogue! Ask about markets, tokens, or general crypto questions.</p>
                    <div className="bg-[#0d1117] rounded p-3 font-mono text-xs">
                        <div className="text-gray-500"># Examples</div>
                        <div className="text-white mt-1">What's the sentiment on BTC right now?</div>
                        <div className="text-white mt-1">Show me recent signals</div>
                        <div className="text-white mt-1">Any good yield farms on Arbitrum?</div>
                        <div className="text-white mt-1">Explain what CVD means</div>
                    </div>
                    <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded p-3">
                        <p className="text-blue-200 text-sm">
                            <strong>💡 Smart Routing:</strong> Rogue automatically decides whether to use database queries or real-time web/X search based on your question.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">How Signals Are Delivered</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Tier-Based Broadcasting</h3>
                <p className="text-gray-300 mb-4">When Rogue generates a new signal, it's automatically broadcasted to Telegram in tiers:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">💎🥇</span>
                            <span className="text-white font-semibold text-sm">Immediate</span>
                        </div>
                        <p className="text-gray-400 text-xs">Diamond & Gold — 100% coverage</p>
                    </div>
                    <div className="bg-gray-400/10 border border-gray-400/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🥈</span>
                            <span className="text-white font-semibold text-sm">+15 minutes</span>
                        </div>
                        <p className="text-gray-400 text-xs">Silver — 100% coverage</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🌐</span>
                            <span className="text-white font-semibold text-sm">+30 minutes</span>
                        </div>
                        <p className="text-gray-400 text-xs">Public — Curated highlights on X</p>
                    </div>
                </div>

                <div className="bg-[#0d1117] rounded p-4 font-mono text-xs">
                    <div className="text-teal-glow mb-2">Example Signal Message:</div>
                    <div className="text-gray-300">
{`🚨 NEW SIGNAL: SOL

📊 Entry: $150.00
🎯 Target: $180.00
🛑 Stop Loss: $140.00
📈 Confidence: 95%

💡 Reasoning:
- Strong CVD divergence showing whale accumulation
- ICT order block at $148-152 zone
- Breaking above key resistance with volume

⚡ Signal ID: abc123
🕒 20:00:00 UTC`}
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Custom Scans (Diamond Exclusive)</h2>
            
            <div className="space-y-4">
                <p className="text-gray-300">
                    Diamond tier users can request on-demand analysis of any token. This triggers a full agent swarm execution specifically for your requested token.
                </p>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4">How It Works</h3>
                    
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 text-teal-glow font-bold text-sm">1</div>
                            <div>
                                <p className="text-gray-300"><strong className="text-white">You request:</strong> <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/scan PEPE</code></p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 text-teal-glow font-bold text-sm">2</div>
                            <div>
                                <p className="text-gray-300"><strong className="text-white">Scanner Agent</strong> fetches real-time data for PEPE specifically</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 text-teal-glow font-bold text-sm">3</div>
                            <div>
                                <p className="text-gray-300"><strong className="text-white">Analyzer Agent</strong> performs full technical + fundamental analysis</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 text-teal-glow font-bold text-sm">4</div>
                            <div>
                                <p className="text-gray-300"><strong className="text-white">Results delivered</strong> to your Telegram within 5-10 minutes</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-200 text-sm">
                        <strong>💡 Pro Tip:</strong> Use custom scans to stay ahead of trends. If you're hearing about a token on Twitter before Rogue scans it, request a custom analysis immediately.
                    </p>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Chat Capabilities</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-3">📊 Database Queries</h3>
                    <p className="text-gray-400 text-sm mb-3">Rogue can access your account data and recent activity:</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li>• Recent signals</li>
                        <li>• Intel reports</li>
                        <li>• Yield opportunities</li>
                        <li>• Airdrop alerts</li>
                        <li>• Your tier status</li>
                    </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-3">🌐 Real-Time Research</h3>
                    <p className="text-gray-400 text-sm mb-3">For market questions, Rogue searches live data:</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li>• Current token prices</li>
                        <li>• X (Twitter) sentiment</li>
                        <li>• Breaking news</li>
                        <li>• Protocol updates</li>
                        <li>• Market trends</li>
                    </ul>
                </div>
            </div>

            <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-3">Example Conversations</h3>
                <div className="space-y-4">
                    <div className="bg-[#0d1117] rounded p-4">
                        <div className="text-blue-400 text-sm mb-1">You:</div>
                        <div className="text-white mb-3">Show me the last 3 signals</div>
                        <div className="text-green-400 text-sm mb-1">Rogue:</div>
                        <div className="text-gray-300 text-sm">Here are your last 3 signals: 1) SOL at $150... 2) ETH at $2400... 3) BTC at $68k...</div>
                    </div>

                    <div className="bg-[#0d1117] rounded p-4">
                        <div className="text-blue-400 text-sm mb-1">You:</div>
                        <div className="text-white mb-3">What's happening with BONK right now?</div>
                        <div className="text-green-400 text-sm mb-1">Rogue:</div>
                        <div className="text-gray-300 text-sm">*Searches X and web* BONK is seeing increased volume due to new Coinbase listing announcement. Current price $0.000025, up 15% in 24h...</div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Troubleshooting</h2>
            
            <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-2">Not receiving signals?</h3>
                    <ul className="space-y-1 text-gray-400 text-sm">
                        <li>• Make sure you've run <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/verify</code></li>
                        <li>• Check your tier with <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/start</code></li>
                        <li>• Ensure bot is not muted or blocked</li>
                        <li>• Public tier users receive curated signals on X only — <strong className="text-teal-glow">upgrade to Silver+ for 100% signal coverage via Telegram</strong></li>
                    </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-2">/scan command not working?</h3>
                    <ul className="space-y-1 text-gray-400 text-sm">
                        <li>• Verify you have Diamond tier (1,000+ $RGE)</li>
                        <li>• Check token symbol/contract is valid</li>
                        <li>• Wait for previous scan to complete before requesting another</li>
                    </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-2">Chat not responding?</h3>
                    <ul className="space-y-1 text-gray-400 text-sm">
                        <li>• Bot may be under high load, wait 10-15 seconds</li>
                        <li>• Try rephrasing your question</li>
                        <li>• Use <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/start</code> to reset conversation</li>
                    </ul>
                </div>
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
