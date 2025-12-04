import { DocsLayout } from '../../components/layout/DocsLayout';
import { HugeiconsIcon } from '@hugeicons/react';
import { CpuIcon, Analytics01Icon, Globe02Icon, Rocket01Icon } from '@hugeicons/core-free-icons';
import { Link } from 'react-router-dom';

export default function Architecture() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                System Architecture
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                Rogue operates as a <strong className="text-white">Swarm of Agents</strong>—a coordinated system where specialized AI agents collaborate to perform complex analytical tasks that no single model could handle effectively.
            </p>
        </div>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">The Orchestrator</h2>
            <p className="text-gray-300 mb-6">
                The <strong className="text-white">Orchestrator</strong> is the conductor of the entire operation. It manages the lifecycle of all agent swarms and ensures coordinated execution.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Core Responsibilities</h3>
                <ul className="space-y-3 text-gray-300 list-none">
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow">→</span>
                        <span><strong className="text-white">Schedules swarm runs</strong> on a configurable interval (default: every 1 hour via <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">RUN_INTERVAL_MINUTES=60</code>)</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow">→</span>
                        <span><strong className="text-white">Intelligent timing management</strong> by checking database history to avoid overlapping runs</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow">→</span>
                        <span><strong className="text-white">Parallel data fetching</strong> from 6+ sources (CoinGecko, Birdeye, DeFi Llama, CoinMarketCap)</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow">→</span>
                        <span><strong className="text-white">Routes data</strong> to specialized agents based on current objectives</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow">→</span>
                        <span><strong className="text-white">Enforces signal quotas</strong> (max 3 published signals per 24 hours to maintain quality)</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow">→</span>
                        <span><strong className="text-white">Broadcasts real-time logs</strong> to the dashboard for transparency</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-teal-glow">→</span>
                        <span><strong className="text-white">Error recovery</strong> with retry logic and graceful degradation</span>
                    </li>
                </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-blue-200 text-sm">
                    <strong>💡 Key Intelligence:</strong> The Orchestrator checks recent post history to avoid repetitive content, ensuring each signal is unique and valuable.
                </p>
            </div>

            <h3 className="text-2xl font-bold text-white mb-4 mt-8">Startup Sequence</h3>
            <p className="text-gray-300 mb-4">When the backend starts, the Orchestrator performs the following initialization:</p>
            
            <div className="space-y-3 mb-6">
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center text-teal-glow font-bold text-sm flex-shrink-0 border border-teal-glow/30">1</div>
                    <div className="text-gray-300">
                        <p className="font-medium text-white mb-1">Database Check</p>
                        <p className="text-sm">Queries Supabase for the last swarm run timestamp</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center text-teal-glow font-bold text-sm flex-shrink-0 border border-teal-glow/30">2</div>
                    <div className="text-gray-300">
                        <p className="font-medium text-white mb-1">Intelligent Scheduling</p>
                        <p className="text-sm">Calculates time since last run. If less than interval, schedules next run accordingly. If more than interval, triggers immediately.</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center text-teal-glow font-bold text-sm flex-shrink-0 border border-teal-glow/30">3</div>
                    <div className="text-gray-300">
                        <p className="font-medium text-white mb-1">Background Services</p>
                        <p className="text-sm">Starts Signal Monitor (2min), Scheduled Post Processor (1min), and Telegram bot</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Agent Swarm Flow</h2>
            <p className="text-gray-300 mb-6">
                A complete swarm run follows this coordinated execution flow:
            </p>

            <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10"></div>
                
                <div className="space-y-6 relative">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 border-2 border-blue-500/50 relative z-10">
                            <span className="text-blue-400 font-bold text-sm">1</span>
                        </div>
                        <div className="flex-1 pb-6">
                            <h3 className="text-white font-bold mb-2">Data Collection</h3>
                            <p className="text-gray-400 text-sm mb-2">Orchestrator fetches market data in parallel from all sources</p>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs font-mono">
                                <div className="text-gray-400">CoinGecko trending, Birdeye trending, Top gainers, DeFi Llama TVL</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 border-2 border-purple-500/50 relative z-10">
                            <span className="text-purple-400 font-bold text-sm">2</span>
                        </div>
                        <div className="flex-1 pb-6">
                            <h3 className="text-white font-bold mb-2">Scanner Agent Execution</h3>
                            <p className="text-gray-400 text-sm mb-2">Determines market bias (LONG/SHORT/NEUTRAL), then identifies up to 3 aligned candidates</p>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Bias-first methodology: BTC context → funding rates → sentiment → find matching tokens</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 border-2 border-pink-500/50 relative z-10">
                            <span className="text-pink-400 font-bold text-sm">3</span>
                        </div>
                        <div className="flex-1 pb-6">
                            <h3 className="text-white font-bold mb-2">Chart Generation + Vision Analysis</h3>
                            <p className="text-gray-400 text-sm mb-2">Generate TradingView-style charts for each candidate, send to Vision LLM for analysis</p>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Vision LLM analyzes trends, patterns, S/R levels → returns textual analysis for Analyzer</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border-2 border-green-500/50 relative z-10">
                            <span className="text-green-400 font-bold text-sm">4</span>
                        </div>
                        <div className="flex-1 pb-6">
                            <h3 className="text-white font-bold mb-2">Analyzer Agent Execution</h3>
                            <p className="text-gray-400 text-sm mb-2">Deep analysis combining visual chart insights + advanced TA + fundamentals + sentiment</p>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Requires 85%+ confidence, 2+ confluences, 1:2 R:R, and 50%+ MTF alignment</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border-2 border-orange-500/50 relative z-10">
                            <span className="text-orange-400 font-bold text-sm">5</span>
                        </div>
                        <div className="flex-1 pb-6">
                            <h3 className="text-white font-bold mb-2">Writer & Generator Agents</h3>
                            <p className="text-gray-400 text-sm mb-2">Formats signal into professional content for different platforms</p>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Creates tweet, Telegram message, blog post, and image prompt</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 border-2 border-teal-500/50 relative z-10">
                            <span className="text-teal-400 font-bold text-sm">6</span>
                        </div>
                        <div className="flex-1 pb-6">
                            <h3 className="text-white font-bold mb-2">Publisher Agent Execution</h3>
                            <p className="text-gray-400 text-sm mb-2">Distributes signal based on tier timing and monitors status</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                <div className="bg-white/5 border border-white/10 rounded p-2">
                                    <p className="text-xs text-white font-medium">Diamond/Gold</p>
                                    <p className="text-xs text-gray-400">Immediate</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded p-2">
                                    <p className="text-xs text-white font-medium">Silver</p>
                                    <p className="text-xs text-gray-400">+15 minutes</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded p-2">
                                    <p className="text-xs text-white font-medium">Public</p>
                                    <p className="text-xs text-gray-400">+30 minutes</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 border-2 border-red-500/50 relative z-10">
                            <span className="text-red-400 font-bold text-sm">7</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold mb-2">Signal Monitoring</h3>
                            <p className="text-gray-400 text-sm mb-2">Continuous price tracking for target/stop loss alerts</p>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Runs every 2 minutes, alerts users when targets hit</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Specialized Agent Modules</h2>
            <p className="text-gray-300 mb-6">
                In addition to the main signal generation flow, Rogue includes specialized agents for different content types:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/docs/agents/intel" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
                            <HugeiconsIcon icon={Globe02Icon} className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold mb-2">Intel Agent</h3>
                            <p className="text-gray-400 text-sm">Analyzes market narratives, sector rotation, and macro trends. Runs every 6 hours.</p>
                        </div>
                    </div>
                </Link>

                <Link to="/docs/agents/yield" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-green-500/30 transition-all group">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                            <HugeiconsIcon icon={Analytics01Icon} className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold mb-2">Yield Agent</h3>
                            <p className="text-gray-400 text-sm">Discovers and analyzes DeFi yield farming opportunities. Runs every 6 hours.</p>
                        </div>
                    </div>
                </Link>

                <Link to="/docs/agents/airdrop" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all group">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                            <HugeiconsIcon icon={Rocket01Icon} className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold mb-2">Airdrop Agent</h3>
                            <p className="text-gray-400 text-sm">Tracks and analyzes upcoming airdrops and token launches. Runs every 6 hours.</p>
                        </div>
                    </div>
                </Link>

                <Link to="/docs/agents/chat" className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-teal-500/30 transition-all group">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors">
                            <HugeiconsIcon icon={CpuIcon} className="w-6 h-6 text-teal-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold mb-2">Chat Agent</h3>
                            <p className="text-gray-400 text-sm">Interactive AI for answering questions about tokens, market conditions, and custom analysis.</p>
                        </div>
                    </div>
                </Link>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Data Sources & Integration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2 text-sm">CoinGecko</h4>
                    <p className="text-xs text-gray-400">Trending coins, price data, market caps</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2 text-sm">Birdeye</h4>
                    <p className="text-xs text-gray-400">Real-time DEX data, Solana tokens</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2 text-sm">DeFi Llama</h4>
                    <p className="text-xs text-gray-400">TVL data, protocol analytics</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2 text-sm">CoinMarketCap</h4>
                    <p className="text-xs text-gray-400">Market data, top gainers/losers</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-2 text-sm">Tavily AI Search</h4>
                    <p className="text-xs text-gray-400">Real-time web & X (Twitter) search</p>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Tech Stack</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold mb-4">Backend</h3>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li>• <strong className="text-white">Node.js 18+</strong> with TypeScript</li>
                        <li>• <strong className="text-white">Express</strong> for API server</li>
                        <li>• <strong className="text-white">@iqai/adk</strong> for agent orchestration</li>
                        <li>• <strong className="text-white">Supabase</strong> (PostgreSQL) for data storage</li>
                        <li>• <strong className="text-white">OpenAI GPT-5 (gpt-5-nano)</strong> and <strong className="text-white">Grok 4 (grok-4-fast)</strong> for LLMs</li>
                    </ul>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold mb-4">Frontend</h3>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li>• <strong className="text-white">React 18</strong> with TypeScript</li>
                        <li>• <strong className="text-white">Vite</strong> for fast builds</li>
                        <li>• <strong className="text-white">Tailwind CSS</strong> for styling</li>
                        <li>• <strong className="text-white">Framer Motion</strong> for animations</li>
                        <li>• <strong className="text-white">React Query</strong> for data fetching</li>
                    </ul>
                </div>
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
