import { DocsLayout } from '../../components/layout/DocsLayout';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';

export default function Quickstart() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Quickstart Guide
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                Get Rogue up and running in under 10 minutes. This guide covers installation, configuration, and deployment.
            </p>
        </div>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Prerequisites</h2>
            <p className="text-gray-300 mb-4">Before you begin, ensure you have the following installed:</p>
            <ul className="space-y-3 my-6 list-none">
                <li className="flex items-start gap-3 text-gray-300">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-teal-glow mt-1 flex-shrink-0" />
                    <span><strong className="text-white">Node.js 18+</strong> and npm or yarn</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-teal-glow mt-1 flex-shrink-0" />
                    <span><strong className="text-white">Git</strong> for cloning the repository</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-teal-glow mt-1 flex-shrink-0" />
                    <span><strong className="text-white">Supabase account</strong> for database and authentication</span>
                </li>
            </ul>
        </section>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Step 1: Clone the Repository</h2>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-4 font-mono text-sm overflow-x-auto">
                <div className="flex items-center gap-2 text-gray-500 mb-2 select-none">
                    <span className="text-red-400">●</span>
                    <span className="text-yellow-400">●</span>
                    <span className="text-green-400">●</span>
                    <span className="ml-2">bash</span>
                </div>
                <div className="text-gray-300">
                    <span className="text-purple-400">git</span> clone https://github.com/zaikaman/RogueAgent.git<br/>
                    <span className="text-purple-400">cd</span> RogueAgent
                </div>
            </div>
        </section>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Step 2: Install Dependencies</h2>
            <p className="text-gray-300 mb-4">Install dependencies for both backend and frontend:</p>
            
            <h3 className="text-xl font-semibold text-white mb-3">Backend</h3>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-6 font-mono text-sm overflow-x-auto">
                <div className="flex items-center gap-2 text-gray-500 mb-2 select-none">
                    <span className="text-red-400">●</span>
                    <span className="text-yellow-400">●</span>
                    <span className="text-green-400">●</span>
                    <span className="ml-2">bash</span>
                </div>
                <div className="text-gray-300">
                    <span className="text-purple-400">cd</span> backend<br/>
                    <span className="text-purple-400">npm</span> install
                </div>
            </div>

            <h3 className="text-xl font-semibold text-white mb-3">Frontend</h3>
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-4 font-mono text-sm overflow-x-auto">
                <div className="flex items-center gap-2 text-gray-500 mb-2 select-none">
                    <span className="text-red-400">●</span>
                    <span className="text-yellow-400">●</span>
                    <span className="text-green-400">●</span>
                    <span className="ml-2">bash</span>
                </div>
                <div className="text-gray-300">
                    <span className="text-purple-400">cd</span> ../frontend<br/>
                    <span className="text-purple-400">npm</span> install
                </div>
            </div>
        </section>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Step 3: Database Setup</h2>
            <p className="text-gray-300 mb-4">Create a Supabase project and set up the database:</p>
            
            <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center text-teal-glow font-bold text-sm flex-shrink-0 border border-teal-glow/30">1</div>
                    <div>
                        <p className="text-gray-300">Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">supabase.com</a> and create a new project</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center text-teal-glow font-bold text-sm flex-shrink-0 border border-teal-glow/30">2</div>
                    <div>
                        <p className="text-gray-300">In the SQL editor, run the <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">schema.sql</code> file from the repository root</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-glow/10 flex items-center justify-center text-teal-glow font-bold text-sm flex-shrink-0 border border-teal-glow/30">3</div>
                    <div>
                        <p className="text-gray-300">Copy your Supabase URL and Service Key from Project Settings → API</p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                    <strong>💡 Tip:</strong> The schema.sql file creates all necessary tables for signals, intel posts, airdrops, yield opportunities, and user tiers.
                </p>
            </div>
        </section>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Step 4: Configure Environment Variables</h2>
            <p className="text-gray-300 mb-4">Create <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">.env</code> files for both backend and frontend.</p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Backend Configuration</h3>
            <p className="text-gray-300 mb-4">Create <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">backend/.env</code> with the following:</p>
            
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-4 font-mono text-xs overflow-x-auto">
                <div className="text-gray-300 space-y-1">
                    <div><span className="text-gray-500"># Server</span></div>
                    <div><span className="text-blue-400">PORT</span>=<span className="text-green-400">3000</span></div>
                    <div className="mt-3"><span className="text-gray-500"># Database</span></div>
                    <div><span className="text-blue-400">SUPABASE_URL</span>=<span className="text-green-400">your_supabase_url</span></div>
                    <div><span className="text-blue-400">SUPABASE_SERVICE_KEY</span>=<span className="text-green-400">your_service_key</span></div>
                    <div className="mt-3"><span className="text-gray-500"># AI Models</span></div>
                    <div><span className="text-blue-400">OPENAI_API_KEY</span>=<span className="text-green-400">your_openai_key</span></div>
                    <div><span className="text-blue-400">IQAI_API_KEY</span>=<span className="text-green-400">your_iqai_key</span></div>
                    <div className="mt-3"><span className="text-gray-500"># Data Sources</span></div>
                    <div><span className="text-blue-400">COINGECKO_API_KEY</span>=<span className="text-green-400">your_coingecko_key</span></div>
                    <div><span className="text-blue-400">BIRDEYE_API_KEY</span>=<span className="text-green-400">your_birdeye_key</span></div>
                    <div><span className="text-blue-400">CMC_API_KEY</span>=<span className="text-green-400">your_coinmarketcap_key</span></div>
                    <div><span className="text-blue-400">TAVILY_API_KEY</span>=<span className="text-green-400">your_tavily_key</span></div>
                    <div className="mt-3"><span className="text-gray-500"># Distribution (Optional)</span></div>
                    <div><span className="text-blue-400">TELEGRAM_BOT_TOKEN</span>=<span className="text-green-400">your_telegram_token</span></div>
                    <div><span className="text-blue-400">X_API_KEY</span>=<span className="text-green-400">your_x_api_key</span></div>
                    <div><span className="text-blue-400">X_API_KEY_SECRET</span>=<span className="text-green-400">your_x_api_secret</span></div>
                    <div><span className="text-blue-400">X_ACCESS_TOKEN</span>=<span className="text-green-400">your_x_access_token</span></div>
                    <div><span className="text-blue-400">X_ACCESS_TOKEN_SECRET</span>=<span className="text-green-400">your_x_access_token_secret</span></div>
                    <div className="mt-3"><span className="text-gray-500"># Image Generation (Optional - uses public quota if not set)</span></div>
                    <div><span className="text-blue-400">HF_TOKEN</span>=<span className="text-green-400">your_huggingface_token</span></div>
                </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                <p className="text-orange-200 text-sm">
                    <strong>⚠️ Important:</strong> See the <a href="/docs/configuration" className="text-teal-glow hover:underline">Configuration Guide</a> for detailed information about each environment variable.
                </p>
            </div>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Frontend Configuration</h3>
            <p className="text-gray-300 mb-4">Create <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">frontend/.env</code> with:</p>
            
            <div className="bg-[#0d1117] rounded-lg border border-white/10 p-4 mb-4 font-mono text-xs overflow-x-auto">
                <div className="text-gray-300 space-y-1">
                    <div><span className="text-blue-400">VITE_SUPABASE_URL</span>=<span className="text-green-400">your_supabase_url</span></div>
                    <div><span className="text-blue-400">VITE_SUPABASE_ANON_KEY</span>=<span className="text-green-400">your_anon_key</span></div>
                    <div><span className="text-blue-400">VITE_API_URL</span>=<span className="text-green-400">http://localhost:3000/api</span></div>
                </div>
            </div>
        </section>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Step 5: Run the Application</h2>
            
            <h3 className="text-xl font-semibold text-white mb-3">Development Mode</h3>
            <p className="text-gray-300 mb-4">Start both backend and frontend in separate terminals:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <h4 className="text-white font-medium mb-2 text-sm">Backend</h4>
                    <div className="bg-[#0d1117] rounded-lg border border-white/10 p-3 font-mono text-xs">
                        <div className="text-gray-300">
                            <span className="text-purple-400">cd</span> backend<br/>
                            <span className="text-purple-400">npm</span> run dev
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="text-white font-medium mb-2 text-sm">Frontend</h4>
                    <div className="bg-[#0d1117] rounded-lg border border-white/10 p-3 font-mono text-xs">
                        <div className="text-gray-300">
                            <span className="text-purple-400">cd</span> frontend<br/>
                            <span className="text-purple-400">npm</span> run dev
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <p className="text-green-200 text-sm">
                    <strong>✅ Success!</strong> Your backend will be running at <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">http://localhost:3000</code> and frontend at <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">http://localhost:5173</code>
                </p>
            </div>

            <h3 className="text-xl font-semibold text-white mb-3 mt-8">What Happens on Startup?</h3>
            <p className="text-gray-300 mb-4">When the backend starts, it automatically:</p>
            <ul className="space-y-2 text-gray-300 list-none mb-6">
                <li className="flex items-start gap-3">
                    <span className="text-teal-glow">→</span>
                    <span>Checks the database for the last swarm run</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-teal-glow">→</span>
                    <span>Schedules the next run based on <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">RUN_INTERVAL_MINUTES</code> (default: 60 minutes / 1 hour)</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-teal-glow">→</span>
                    <span>Starts the Signal Monitor (checks every 2 minutes for price targets/stop losses)</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-teal-glow">→</span>
                    <span>Starts the Scheduled Post Processor (processes pending posts every 1 minute)</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-teal-glow">→</span>
                    <span>Initializes Telegram bot (if configured)</span>
                </li>
            </ul>
        </section>

        <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Step 6: Verify Installation</h2>
            <p className="text-gray-300 mb-4">Check that everything is working:</p>

            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0 border border-blue-500/30">1</div>
                    <div>
                        <p className="text-gray-300">Open <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" className="text-teal-glow hover:underline">http://localhost:5173</a> in your browser</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0 border border-blue-500/30">2</div>
                    <div>
                        <p className="text-gray-300">Check the backend logs for "Swarm Scheduler started" and "Signal Monitor started"</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0 border border-blue-500/30">3</div>
                    <div>
                        <p className="text-gray-300">Navigate to <code className="text-teal-glow bg-white/5 px-2 py-0.5 rounded">/app</code> to view the terminal dashboard</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Next Steps</h2>
            <div className="bg-gradient-to-r from-teal-glow/10 to-purple-500/10 border border-teal-glow/30 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">You're all set!</h3>
                <p className="text-gray-300 mb-6">
                    Rogue is now running autonomously. Explore the architecture docs to understand how agents work, or dive into the configuration guide to customize your setup.
                </p>
                <div className="flex flex-wrap gap-4">
                    <a href="/docs/architecture" className="inline-flex items-center px-6 py-3 bg-teal-glow text-black font-bold rounded-lg hover:bg-teal-400 transition-colors">
                        Learn Architecture
                    </a>
                    <a href="/docs/configuration" className="inline-flex items-center px-6 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                        Configuration Guide
                    </a>
                </div>
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
