import { DocsLayout } from '../../components/layout/DocsLayout';

export default function Configuration() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Configuration Guide
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                Complete reference for environment variables and deployment configuration. This guide covers all required and optional settings for both backend and frontend.
            </p>
        </div>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Backend Environment Variables</h2>
            <p className="text-gray-300 mb-6">
                Create a <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">.env</code> file in the <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">backend/</code> directory.
            </p>

            <div className="space-y-8">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Server Configuration</h3>
                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">PORT</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">The port number for the Express server.</p>
                            <p className="text-gray-400 text-xs mb-3">Default: <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">3000</code></p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">PORT</span>=<span className="text-green-400">3000</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mt-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">RUN_INTERVAL_MINUTES</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">How often the agent swarm runs (in minutes).</p>
                            <p className="text-gray-400 text-xs mb-3">Default: <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">60</code> (1 hour)</p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">RUN_INTERVAL_MINUTES</span>=<span className="text-green-400">60</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Database (Supabase)</h3>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                        <p className="text-orange-200 text-sm">
                            <strong>⚠️ Required:</strong> These variables are essential for database connectivity.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">SUPABASE_URL</code>
                            <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Required</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">Your Supabase project URL.</p>
                            <p className="text-gray-400 text-xs mb-3">Find this in: Project Settings → API → Project URL</p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">SUPABASE_URL</span>=<span className="text-green-400">https://xxxxxxxxxxxx.supabase.co</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">SUPABASE_SERVICE_KEY</code>
                            <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Required</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">Your Supabase service role key (NOT the anon key).</p>
                            <p className="text-gray-400 text-xs mb-3">Find this in: Project Settings → API → service_role key</p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">SUPABASE_SERVICE_KEY</span>=<span className="text-green-400">eyJhbGciOiJIUzI1...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">AI Models</h3>
                    
                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">OPENAI_API_KEY</code>
                            <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Required</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">OpenAI API key for GPT-5 access.</p>
                            <p className="text-gray-400 text-xs mb-3">Get from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">platform.openai.com/api-keys</a></p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">OPENAI_API_KEY</span>=<span className="text-green-400">sk-proj-...</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">IQAI_API_KEY</code>
                            <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Required</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">IQ AI API key for agent orchestration framework.</p>
                            <p className="text-gray-400 text-xs mb-3">Get from: <a href="https://iqai.com" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">iqai.com</a></p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">IQAI_API_KEY</span>=<span className="text-green-400">iqai_...</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">SCANNER_API_KEY</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">API key for alternative Scanner LLM endpoint.</p>
                            <p className="text-gray-400 text-xs mb-3">Configure with <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">SCANNER_BASE_URL</code> and <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">SCANNER_MODEL</code></p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">SCANNER_BASE_URL</span>=<span className="text-green-400">https://v98store.com/v1</span><br/>
                                <span className="text-blue-400">SCANNER_MODEL</span>=<span className="text-green-400">grok-4-fast</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">OPENAI_API_KEY</code>
                            <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Required</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">OpenAI API key for GPT-5 integration.</p>
                            <p className="text-gray-400 text-xs mb-3">Get from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">platform.openai.com/api-keys</a></p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">OPENAI_BASE_URL & OPENAI_MODEL</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">Customize OpenAI endpoint and model selection.</p>
                            <p className="text-gray-400 text-xs mb-3">Default: <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">gpt-5-nano-2025-08-07</code> via custom base URL</p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">OPENAI_BASE_URL</span>=<span className="text-green-400">https://gpt1.shupremium.com/v1</span><br/>
                                <span className="text-blue-400">OPENAI_MODEL</span>=<span className="text-green-400">gpt-5-nano-2025-08-07</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-200 text-sm">
                            <strong>💡 Models:</strong> Analyzer uses <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">gpt-5-nano</code>, Scanner uses <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">grok-4-fast</code> for advanced TA analysis.
                        </p>
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Data Sources</h3>
                    
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                        <p className="text-blue-200 text-sm">
                            <strong>💡 Tip:</strong> CoinGecko, Birdeye, and CMC support multiple API keys (KEY_1, KEY_2, etc.) for rate limit rotation. The system will automatically cycle through them.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { name: 'COINGECKO_API_KEY_1 to KEY_10', desc: 'For trending coins and price data (supports up to 10 keys for rotation)', url: 'coingecko.com', required: true },
                            { name: 'BIRDEYE_API_KEY_1 to KEY_10', desc: 'For real-time Solana DEX data (supports up to 10 keys for rotation)', url: 'birdeye.so', required: true },
                            { name: 'CMC_API_KEY_1 to KEY_10', desc: 'CoinMarketCap for market data (supports up to 10 keys for rotation)', url: 'coinmarketcap.com/api', required: true },
                            { name: 'TAVILY_API_KEY', desc: 'For AI-powered web and X search', url: 'tavily.com', required: true },
                        ].map(item => (
                            <div key={item.name} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                                    <code className="text-teal-glow font-mono text-sm">{item.name}</code>
                                    <span className={`px-2 py-0.5 ${item.required ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'} text-xs rounded`}>
                                        {item.required ? 'Required' : 'Optional'}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <p className="text-gray-300 text-sm mb-2">{item.desc}</p>
                                    {item.url && (
                                        <p className="text-gray-400 text-xs">Get from: <a href={`https://${item.url}`} target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">{item.url}</a></p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Distribution Channels (Optional)</h3>
                    
                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">TELEGRAM_BOT_TOKEN</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">Bot token for Telegram signal distribution.</p>
                            <p className="text-gray-400 text-xs mb-3">Get from: <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">@BotFather on Telegram</a></p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">TELEGRAM_BOT_TOKEN</span>=<span className="text-green-400">123456789:ABC...</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">X API OAuth 1.0a Credentials</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">X API v2 OAuth 1.0a credentials for posting signals to X (Twitter).</p>
                            <p className="text-gray-400 text-xs mb-3">Get from: <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">X Developer Portal</a></p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs space-y-1">
                                <div><span className="text-blue-400">X_API_KEY</span>=<span className="text-green-400">your-api-key</span></div>
                                <div><span className="text-blue-400">X_API_KEY_SECRET</span>=<span className="text-green-400">your-api-key-secret</span></div>
                                <div><span className="text-blue-400">X_ACCESS_TOKEN</span>=<span className="text-green-400">your-access-token</span></div>
                                <div><span className="text-blue-400">X_ACCESS_TOKEN_SECRET</span>=<span className="text-green-400">your-access-token-secret</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">HF_TOKEN</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">Hugging Face token for AI image generation (uses Z-Image-Turbo). Works without token using public quota.</p>
                            <p className="text-gray-400 text-xs">Get from: <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">huggingface.co/settings/tokens</a></p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Web3 & Blockchain</h3>
                    
                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">SOLANA_RPC_URL</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">RPC endpoint for Solana chain interactions.</p>
                            <p className="text-gray-400 text-xs mb-3">Default: <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">https://api.mainnet-beta.solana.com</code></p>
                            <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                                <span className="text-blue-400">SOLANA_RPC_URL</span>=<span className="text-green-400">https://api.mainnet-beta.solana.com</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <code className="text-teal-glow font-mono text-sm">AGENT_TOKEN_CONTRACT</code>
                            <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-300 mb-2 text-sm">Contract address for RGE token (tier verification).</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Frontend Environment Variables</h2>
            <p className="text-gray-300 mb-6">
                Create a <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">.env</code> file in the <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">frontend/</code> directory.
            </p>

            <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <code className="text-teal-glow font-mono text-sm">VITE_SUPABASE_URL</code>
                        <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Required</span>
                    </div>
                    <div className="p-4">
                        <p className="text-gray-300 mb-2 text-sm">Same as backend SUPABASE_URL.</p>
                        <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                            <span className="text-blue-400">VITE_SUPABASE_URL</span>=<span className="text-green-400">https://xxxxxxxxxxxx.supabase.co</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <code className="text-teal-glow font-mono text-sm">VITE_SUPABASE_ANON_KEY</code>
                        <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Required</span>
                    </div>
                    <div className="p-4">
                        <p className="text-gray-300 mb-2 text-sm">Supabase anonymous (public) key for frontend auth.</p>
                        <p className="text-gray-400 text-xs mb-3">Find in: Project Settings → API → anon public key</p>
                        <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                            <span className="text-blue-400">VITE_SUPABASE_ANON_KEY</span>=<span className="text-green-400">eyJhbGciOiJIUzI1...</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <code className="text-teal-glow font-mono text-sm">VITE_API_URL</code>
                        <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Optional</span>
                    </div>
                    <div className="p-4">
                        <p className="text-gray-300 mb-2 text-sm">Backend API endpoint.</p>
                        <p className="text-gray-400 text-xs mb-3">Default: <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">http://localhost:3000/api</code></p>
                        <div className="bg-[#0d1117] rounded p-2 font-mono text-xs">
                            <span className="text-blue-400">VITE_API_URL</span>=<span className="text-green-400">http://localhost:3000/api</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Deployment Checklist</h2>
            <div className="space-y-3">
                {[
                    'Set all required environment variables',
                    'Run schema.sql in Supabase SQL editor',
                    'Test backend with npm run dev',
                    'Test frontend with npm run dev',
                    'Configure production URLs for VITE_API_URL',
                    'Set up domain and SSL certificates',
                    'Configure CORS in backend for production domain',
                    'Deploy backend (Railway, Render, or VPS)',
                    'Deploy frontend (Vercel, Netlify, or Cloudflare Pages)',
                ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-teal-glow/10 flex items-center justify-center flex-shrink-0 border border-teal-glow/30">
                            <span className="text-teal-glow text-xs">{i + 1}</span>
                        </div>
                        <p className="text-gray-300 text-sm mt-0.5">{item}</p>
                    </div>
                ))}
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
