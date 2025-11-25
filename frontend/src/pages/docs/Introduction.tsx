import { Link } from 'react-router-dom';
import { DocsLayout } from '../../components/layout/DocsLayout';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, FlashIcon, Shield02Icon, Rocket01Icon, Analytics01Icon } from '@hugeicons/core-free-icons';

export default function Introduction() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Welcome to Rogue
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                An autonomous multi-agent system for crypto market intelligence. Rogue operates 24/7, scanning global markets, analyzing on-chain data, and delivering high-conviction trading signals with institutional-grade analysis.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <Link to="/docs/quickstart" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-teal-glow/30 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-teal-glow/10 flex items-center justify-center mb-4 group-hover:bg-teal-glow/20 transition-colors">
                    <HugeiconsIcon icon={Rocket01Icon} className="w-6 h-6 text-teal-glow" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Quickstart Guide</h3>
                <p className="text-gray-400 text-sm mb-4">Get up and running in minutes. Deploy your first autonomous agent swarm.</p>
                <div className="flex items-center text-teal-glow text-sm font-medium">
                    Start building <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 ml-1" />
                </div>
            </Link>
            
            <Link to="/docs/architecture" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                    <HugeiconsIcon icon={Analytics01Icon} className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Architecture Deep Dive</h3>
                <p className="text-gray-400 text-sm mb-4">Understand the multi-agent orchestration system.</p>
                <div className="flex items-center text-purple-400 text-sm font-medium">
                    Learn more <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 ml-1" />
                </div>
            </Link>

            <Link to="/docs/agents" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <HugeiconsIcon icon={FlashIcon} className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Agent Reference</h3>
                <p className="text-gray-400 text-sm mb-4">Detailed documentation for each specialized agent.</p>
                <div className="flex items-center text-blue-400 text-sm font-medium">
                    Explore agents <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 ml-1" />
                </div>
            </Link>

            <Link to="/docs/configuration" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-orange-500/30 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                    <HugeiconsIcon icon={Shield02Icon} className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Configuration</h3>
                <p className="text-gray-400 text-sm mb-4">Environment variables and deployment setup.</p>
                <div className="flex items-center text-orange-400 text-sm font-medium">
                    Configure <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 ml-1" />
                </div>
            </Link>
        </div>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">What is Rogue?</h2>
            <p className="text-gray-300 mb-6">
                Rogue is not just a bot; it's an <strong className="text-white">autonomous Crypto Alpha Oracle</strong>—a sophisticated multi-agent system designed to operate as your personal institutional-grade research desk.
            </p>
            <p className="text-gray-300 mb-6">
                Built on cutting-edge AI agent orchestration using the <a href="https://github.com/iqai/adk" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">@iqai/adk framework</a>, Rogue continuously monitors cryptocurrency markets across multiple dimensions:
            </p>
            <ul className="space-y-3 my-6 list-none">
                <li className="flex items-start gap-3 text-gray-300">
                    <span className="text-teal-glow text-xl">•</span>
                    <span><strong className="text-white">30+ data sources</strong> including CoinGecko, Birdeye, DeFi Llama, CoinMarketCap</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                    <span className="text-teal-glow text-xl">•</span>
                    <span><strong className="text-white">Real-time social sentiment</strong> from X (Twitter) and crypto news sources</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                    <span className="text-teal-glow text-xl">•</span>
                    <span><strong className="text-white">On-chain analytics</strong> tracking volume spikes, whale movements, and TVL shifts</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                    <span className="text-teal-glow text-xl">•</span>
                    <span><strong className="text-white">Advanced Technical Analysis</strong> using 2025 meta indicators: CVD, ICT Order Blocks, Volume Profile, SuperTrend, BB Squeeze, VW-MACD, Fibonacci, and MTF alignment</span>
                </li>
            </ul>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">The Problem We Solve</h2>
            <p className="text-gray-300 mb-4">
                The cryptocurrency market generates <strong className="text-white">millions of data points</strong> per day:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6 text-gray-300">
                <li>20,000+ active tokens across 100+ chains</li>
                <li>Hundreds of new narratives and trends emerging weekly</li>
                <li>Constant flow of news, announcements, and social chatter</li>
                <li>Complex on-chain signals requiring technical expertise</li>
            </ul>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 mb-6">
                <p className="text-orange-200 font-medium">
                    For individual traders, this creates <strong>analysis paralysis</strong>. By the time you've researched one opportunity, ten more have appeared—and the original may have already moved.
                </p>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Rogue's Solution</h3>
            <p className="text-gray-300 mb-4">
                Rogue acts as your <strong className="text-white">always-on research team</strong>, combining:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Real-time Surveillance</h4>
                    <p className="text-sm text-gray-400">Across all major chains and exchanges, 24/7</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Multi-dimensional Analysis</h4>
                    <p className="text-sm text-gray-400">Technical + Fundamental + Sentiment combined</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">AI-powered Synthesis</h4>
                    <p className="text-sm text-gray-400">Connects disparate signals into actionable insights</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Automated Distribution</h4>
                    <p className="text-sm text-gray-400">Alerts delivered the moment opportunities emerge</p>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">What Makes Rogue Different?</h2>
            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                        <span className="text-teal-glow font-bold">🎯</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Autonomous Operation</h3>
                        <p className="text-gray-400">No manual input required. Rogue runs on a configurable schedule (default: every 1 hour), hunting for alpha while you sleep.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                        <span className="text-purple-400 font-bold">🧠</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Multi-Agent Intelligence</h3>
                        <p className="text-gray-400">Unlike single-model systems, Rogue deploys specialized agents for scanning, analysis, content generation, and distribution—each optimized for its specific task.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                        <span className="text-green-400 font-bold">📈</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Day Trading Focused</h3>
                        <p className="text-gray-400 mb-2">Rogue specializes in <strong className="text-white">day trades</strong> (4-24h holds) with selective swing trades:</p>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>• Minimum <strong className="text-white">4% stop-loss</strong> distance (never tighter)</li>
                            <li>• <strong className="text-white">1:2 minimum R:R</strong> for all trades</li>
                            <li>• Structural stops at real support levels</li>
                            <li>• No scalping, no tight stops, no noise</li>
                        </ul>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                        <span className="text-blue-400 font-bold">🎚️</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Tiered Distribution</h3>
                        <p className="text-gray-400 mb-2">Signals are distributed strategically based on user tier:</p>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>• <strong className="text-white">Diamond/Gold</strong> tier: Immediate alerts</li>
                            <li>• <strong className="text-white">Silver</strong> tier: Signals after 15 minutes</li>
                            <li>• <strong className="text-white">Public</strong> (Twitter): Signals after 30-60 minutes</li>
                        </ul>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                        <span className="text-orange-400 font-bold">🔒</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Limit Order Intelligence</h3>
                        <p className="text-gray-400">Rogue doesn't just find opportunities—it determines optimal entry points. When a token is extended, it sets limit orders at key support levels and monitors the market.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Next Steps</h2>
            <div className="bg-gradient-to-r from-teal-glow/10 to-purple-500/10 border border-teal-glow/30 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">Ready to get started?</h3>
                <p className="text-gray-300 mb-6">
                    Follow our quickstart guide to deploy Rogue in under 10 minutes, or dive deep into the architecture to understand how the system works.
                </p>
                <div className="flex flex-wrap gap-4">
                    <Link to="/docs/quickstart" className="inline-flex items-center px-6 py-3 bg-teal-glow text-black font-bold rounded-lg hover:bg-teal-400 transition-colors">
                        Quickstart Guide <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 ml-2" />
                    </Link>
                    <Link to="/docs/architecture" className="inline-flex items-center px-6 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                        View Architecture <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 ml-2" />
                    </Link>
                </div>
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
