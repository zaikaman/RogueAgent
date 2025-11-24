import { DocsLayout } from '../../components/layout/DocsLayout';

export default function API() {
  return (
    <DocsLayout>
      <div className="prose prose-invert prose-lg max-w-none">
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                API Reference
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
                Complete documentation for all REST API endpoints. Base URL: <code className="text-teal-glow bg-white/5 px-2 py-1 rounded">https://rogue-6a0e7f8c39ad.herokuapp.com/api</code>
            </p>
        </div>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Authentication</h2>
            <p className="text-gray-300 mb-4">
                Most endpoints are public. Tier-restricted endpoints (like custom scans) require wallet verification through the <code className="text-teal-glow bg-white/5 px-2 py-1 rounded">/tiers/verify</code> endpoint.
            </p>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Signals</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/signals/history</code>
                </div>
                <p className="text-gray-300 mb-4">Get historical trading signals with tier-based filtering.</p>
                
                <h4 className="text-white font-semibold mb-2">Query Parameters</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 mb-4 font-mono text-sm">
                    <div className="grid grid-cols-1 gap-2">
                        <div><span className="text-blue-400">limit</span>: <span className="text-green-400">number</span> <span className="text-gray-500">(default: 20)</span></div>
                        <div><span className="text-blue-400">page</span>: <span className="text-green-400">number</span> <span className="text-gray-500">(default: 1)</span></div>
                        <div><span className="text-blue-400">address</span>: <span className="text-green-400">string</span> <span className="text-gray-500">(wallet address for tier filtering)</span></div>
                    </div>
                </div>

                <h4 className="text-white font-semibold mb-2">Response</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs overflow-x-auto">
{`{
  "signals": [
    {
      "id": "uuid",
      "token": "SOL",
      "entry_price": 150.00,
      "target_price": 180.00,
      "stop_loss": 140.00,
      "confidence": 95,
      "reasoning": "Strong bullish momentum...",
      "created_at": "2025-11-24T20:00:00Z"
    }
  ],
  "total": 45,
  "page": 1
}`}
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Intel</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/intel/history</code>
                </div>
                <p className="text-gray-300 mb-4">Get market intelligence reports and narratives.</p>
                
                <h4 className="text-white font-semibold mb-2">Query Parameters</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 mb-4 font-mono text-sm">
                    <div className="grid grid-cols-1 gap-2">
                        <div><span className="text-blue-400">limit</span>: <span className="text-green-400">number</span> <span className="text-gray-500">(default: 10)</span></div>
                        <div><span className="text-blue-400">page</span>: <span className="text-green-400">number</span> <span className="text-gray-500">(default: 1)</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/intel/:id</code>
                </div>
                <p className="text-gray-300 mb-4">Get detailed intel report by ID.</p>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Yield & Airdrops</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/yield</code>
                </div>
                <p className="text-gray-300 mb-4">Get best yield farming opportunities across all chains.</p>
                
                <h4 className="text-white font-semibold mb-2">Response Example</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs overflow-x-auto">
{`{
  "opportunities": [
    {
      "protocol": "Aave V3",
      "chain": "Arbitrum",
      "pool_id": "USDC",
      "apy": 12.5,
      "tvl_usd": 50000000,
      "il_risk": "low"
    }
  ]
}`}
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/airdrops</code>
                </div>
                <p className="text-gray-300 mb-4">Get promising airdrop opportunities with estimated values.</p>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Chat</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded">POST</span>
                    <code className="text-teal-glow font-mono text-lg">/api/chat</code>
                </div>
                <p className="text-gray-300 mb-4">Chat with Rogue AI assistant using natural language.</p>
                
                <h4 className="text-white font-semibold mb-2">Request Body</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 mb-4 font-mono text-xs overflow-x-auto">
{`{
  "message": "What's the sentiment on SOL right now?",
  "context": {
    "walletAddress": "0x...",
    "tier": "GOLD"
  },
  "history": [
    {
      "user": "Previous question",
      "assistant": "Previous response"
    }
  ]
}`}
                </div>

                <h4 className="text-white font-semibold mb-2">Response</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs overflow-x-auto">
{`{
  "message": "Solana is showing bullish momentum...",
  "source": "grok" // or "gpt5" depending on query type
}`}
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Tiers</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded">POST</span>
                    <code className="text-teal-glow font-mono text-lg">/api/tiers/verify</code>
                </div>
                <p className="text-gray-300 mb-4">Verify wallet and determine user tier based on $RGE holdings.</p>
                
                <h4 className="text-white font-semibold mb-2">Request Body</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 mb-4 font-mono text-xs">
{`{
  "walletAddress": "0x..."
}`}
                </div>

                <h4 className="text-white font-semibold mb-2">Response</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "tier": "GOLD",
    "balance": 750.50,
    "telegram_connected": true,
    "telegram_username": "@username"
  }
}`}
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Custom Scans (Diamond Only)</h2>
            
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                <p className="text-orange-200 text-sm">
                    <strong>⚠️ Restricted:</strong> This endpoint requires DIAMOND tier (1,000+ $RGE tokens).
                </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded">POST</span>
                    <code className="text-teal-glow font-mono text-lg">/api/scan</code>
                </div>
                <p className="text-gray-300 mb-4">Request custom analysis of any token with full agent swarm execution.</p>
                
                <h4 className="text-white font-semibold mb-2">Request Body</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 mb-4 font-mono text-xs">
{`{
  "walletAddress": "0x...",
  "tokenSymbol": "PEPE",
  "tokenContract": "0x6982508145454Ce325dDbE47a25d4ec3d2311933" // optional
}`}
                </div>

                <h4 className="text-white font-semibold mb-2">Response</h4>
                <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "requestId": "uuid",
  "message": "Custom scan queued. You'll receive results via Telegram."
}`}
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">System</h2>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/health</code>
                </div>
                <p className="text-gray-300 mb-4">Health check endpoint.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/run-status</code>
                </div>
                <p className="text-gray-300 mb-4">Get status of the latest swarm run (active, idle, error).</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded">GET</span>
                    <code className="text-teal-glow font-mono text-lg">/api/logs</code>
                </div>
                <p className="text-gray-300 mb-4">Get real-time system logs (WebSocket connection recommended).</p>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Error Handling</h2>
            <p className="text-gray-300 mb-4">All endpoints follow a consistent error response format:</p>
            
            <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs mb-4">
{`{
  "success": false,
  "error": "Error message here"
}`}
            </div>

            <h3 className="text-xl font-bold text-white mb-3">Common HTTP Status Codes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <code className="text-green-400">200</code>
                    <p className="text-sm text-gray-400 mt-1">Success</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <code className="text-yellow-400">400</code>
                    <p className="text-sm text-gray-400 mt-1">Bad Request (invalid parameters)</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <code className="text-orange-400">403</code>
                    <p className="text-sm text-gray-400 mt-1">Forbidden (tier restriction)</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <code className="text-red-400">500</code>
                    <p className="text-sm text-gray-400 mt-1">Internal Server Error</p>
                </div>
            </div>
        </section>
      </div>
    </DocsLayout>
  );
}
