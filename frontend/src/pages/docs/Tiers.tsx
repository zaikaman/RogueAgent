import { DocsLayout } from '../../components/layout/DocsLayout';

export default function Tiers() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Tier System
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                Rogue uses a token-gated tier system to provide early access to high-value signals. The more $RGE tokens you hold, the faster you receive alerts.
            </p>
        </div>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Tier Overview</h2>
            
            <div className="grid grid-cols-1 gap-6">
                {/* DIAMOND */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/50 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-500/50">
                                <span className="text-3xl">💎</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">Diamond Tier</h3>
                                <p className="text-blue-300 font-mono">1,000+ $RGE</p>
                            </div>
                        </div>
                        
                        <h4 className="text-white font-semibold mb-3">Benefits</h4>
                        <ul className="space-y-2 text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-teal-glow mt-1">✓</span>
                                <span><strong className="text-white">Immediate signals</strong> - Get alerts the moment analysis completes</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-glow mt-1">✓</span>
                                <span><strong className="text-white">Custom scans</strong> - Request analysis of any token via <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/scan</code> command</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-glow mt-1">✓</span>
                                <span><strong className="text-white">Priority support</strong> - Dedicated Telegram support channel</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-glow mt-1">✓</span>
                                <span><strong className="text-white">Exclusive features</strong> - Early access to new agent capabilities</span>
                            </li>
                        </ul>

                        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-blue-200 text-sm">
                                <strong>30-minute edge</strong> over public signals. Custom scans allow you to stay ahead of trends.
                            </p>
                        </div>
                    </div>
                </div>

                {/* GOLD */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/50 rounded-xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500/50">
                            <span className="text-3xl">🥇</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Gold Tier</h3>
                            <p className="text-yellow-300 font-mono">100-999 $RGE</p>
                        </div>
                    </div>
                    
                    <h4 className="text-white font-semibold mb-3">Benefits</h4>
                    <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Immediate signals</strong> - Same speed as Diamond</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Full intel access</strong> - Market narratives and insights</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Voice chat</strong> - Natural language queries via VAPI</span>
                        </li>
                    </ul>

                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <p className="text-yellow-200 text-sm">
                            <strong>30-minute edge</strong> over public. Perfect for active traders.
                        </p>
                    </div>
                </div>

                {/* SILVER */}
                <div className="bg-gradient-to-br from-gray-400/10 to-gray-500/10 border border-gray-400/50 rounded-xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gray-400/20 flex items-center justify-center border border-gray-400/50">
                            <span className="text-3xl">🥈</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Silver Tier</h3>
                            <p className="text-gray-300 font-mono">10-99 $RGE</p>
                        </div>
                    </div>
                    
                    <h4 className="text-white font-semibold mb-3">Benefits</h4>
                    <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">15-minute early access</strong> - Signals arrive 15 minutes after Diamond/Gold</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Full dashboard access</strong> - View all historical signals</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Chat access</strong> - Ask Rogue about market conditions</span>
                        </li>
                    </ul>

                    <div className="mt-4 bg-gray-400/10 border border-gray-400/30 rounded-lg p-3">
                        <p className="text-gray-200 text-sm">
                            <strong>15-minute edge</strong> over public. Great for swing traders.
                        </p>
                    </div>
                </div>

                {/* PUBLIC */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                            <span className="text-3xl">🌐</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Public Tier</h3>
                            <p className="text-gray-400 font-mono">0-9 $RGE</p>
                        </div>
                    </div>
                    
                    <h4 className="text-white font-semibold mb-3">Benefits</h4>
                    <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Public signals</strong> - Posted to X 60-90 minutes after initial broadcast</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Dashboard view</strong> - See recent signals (limited history)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-teal-glow mt-1">✓</span>
                            <span><strong className="text-white">Follow on X</strong> - @Rogue_IQAI for all public updates</span>
                        </li>
                    </ul>

                    <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                        <p className="text-gray-300 text-sm">
                            Free tier. Great for getting a taste of Rogue's capabilities.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">How Tier Verification Works</h2>
            
            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">1</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-2">Connect Your Wallet</h3>
                        <p className="text-gray-400">Use the dashboard or Telegram bot to verify your wallet address.</p>
                        <div className="bg-[#0d1117] rounded p-2 font-mono text-xs mt-2">
                            /verify 0x1234567890abcdef...
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">2</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-2">On-Chain Balance Check</h3>
                        <p className="text-gray-400">Rogue queries the Fraxtal blockchain for your $RGE token balance at contract address:</p>
                        <code className="text-teal-glow bg-white/5 px-2 py-1 rounded text-xs">0xe5Ee677388a6393d135bEd00213E150b1F64b032</code>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">3</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-2">Tier Assignment</h3>
                        <p className="text-gray-400">Your tier is automatically determined based on holdings:</p>
                        <ul className="mt-2 space-y-1 text-sm text-gray-400">
                            <li>• <strong className="text-blue-300">1,000+</strong> → Diamond</li>
                            <li>• <strong className="text-yellow-300">100-999</strong> → Gold</li>
                            <li>• <strong className="text-gray-300">10-99</strong> → Silver</li>
                            <li>• <strong className="text-gray-500">0-9</strong> → Public</li>
                        </ul>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">4</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-2">Instant Access</h3>
                        <p className="text-gray-400">Your tier benefits activate immediately. No manual approval needed.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Tier-Based Signal Distribution</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Signal Timeline Example</h3>
                
                <div className="relative pl-8 space-y-6">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/10"></div>
                    
                    <div className="relative">
                        <div className="absolute -left-[2.1rem] w-8 h-8 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                            <span className="text-xs">💎</span>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">20:00:00</span>
                                <span className="text-blue-300 text-sm">Diamond & Gold</span>
                            </div>
                            <p className="text-gray-300 text-sm">Signal broadcasted to premium tiers via Telegram</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-[2.1rem] w-8 h-8 rounded-full bg-gray-400/20 border-2 border-gray-400/50 flex items-center justify-center">
                            <span className="text-xs">🥈</span>
                        </div>
                        <div className="bg-gray-400/10 border border-gray-400/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">20:15:00</span>
                                <span className="text-gray-300 text-sm">Silver</span>
                            </div>
                            <p className="text-gray-300 text-sm">Signal broadcasted +15 minutes later</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-[2.1rem] w-8 h-8 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                            <span className="text-xs">🌐</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">20:30:00</span>
                                <span className="text-gray-400 text-sm">Public</span>
                            </div>
                            <p className="text-gray-300 text-sm">Signal posted to X +60-90 minutes later</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">FAQ</h2>
            
            <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-2">Do I need to re-verify after buying more tokens?</h3>
                    <p className="text-gray-400">Yes, run <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/verify</code> again to update your tier. Tiers are checked on-demand, not automatically.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-2">Where do I buy $RGE tokens?</h3>
                    <p className="text-gray-400 mb-3">You can purchase $RGE through the IQ.AI pending page:</p>
                    <a href="https://app.iqai.com/pending/0xe5Ee677388a6393d135bEd00213E150b1F64b032" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-glow/10 hover:bg-teal-glow/20 border border-teal-glow/30 text-teal-glow rounded-lg transition-colors">
                        Buy $RGE on IQ.AI →
                    </a>
                    <p className="text-gray-500 text-sm mt-3">Contract address: <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">0xe5Ee677388a6393d135bEd00213E150b1F64b032</code></p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-2">Can I share signals with friends?</h3>
                    <p className="text-gray-400">Public signals are free to share. Premium signals are for personal use only. Sharing may result in tier revocation.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-2">How often can I request custom scans?</h3>
                    <p className="text-gray-400">Diamond users have unlimited custom scans via <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/scan</code>. However, please allow swarm to complete before requesting another (typically 5-10 minutes).</p>
                </div>
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
