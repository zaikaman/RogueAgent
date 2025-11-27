import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUserTier } from '../hooks/useUserTier';
import { futuresService } from '../services/futures.service';
import { TIERS } from '../constants/tiers';
import { GatedContent } from '../components/GatedContent';
import { FuturesAgent, FuturesPosition, FuturesAccountInfo, FuturesTrade, NetworkMode, SignalJob } from '../types/futures.types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Zap, Power, Plus, Settings, Trash2, Copy, 
  TrendingUp, AlertTriangle, X,
  Bot, Target, Activity, History,
  ChevronDown, ChevronUp, Clock, DollarSign,
  CheckCircle2, XCircle, AlertOctagon, Loader2,
  Globe, FlaskConical, Cpu, Sparkles
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// ═══════════════════════════════════════════════════════════════════════════════
// FUTURES AGENTS PAGE
// Diamond-only Hyperliquid Perpetual Futures automated trading terminal
// Supports both Mainnet (real funds) and Testnet (paper trading)
// ═══════════════════════════════════════════════════════════════════════════════

export function FuturesAgentsPage() {
  const { address } = useAccount();
  const { tier } = useUserTier();
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('testnet');
  const [agents, setAgents] = useState<FuturesAgent[]>([]);
  const [positions, setPositions] = useState<FuturesPosition[]>([]);
  const [trades, setTrades] = useState<FuturesTrade[]>([]);
  const [accountInfo, setAccountInfo] = useState<FuturesAccountInfo | null>(null);
  const [signalJobs, setSignalJobs] = useState<{ active: SignalJob[]; recent: SignalJob[] }>({ active: [], recent: [] });
  
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<FuturesAgent | null>(null);

  // Load data
  useEffect(() => {
    if (!address) return;
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [address]);

  // Faster polling for signal jobs when there are active jobs
  useEffect(() => {
    if (!address || signalJobs.active.length === 0) return;
    const fastPollInterval = setInterval(async () => {
      const jobs = await futuresService.getSignalJobs(address);
      setSignalJobs(jobs);
    }, 2000); // Poll every 2s when jobs are active
    return () => clearInterval(fastPollInterval);
  }, [address, signalJobs.active.length]);

  const loadData = async () => {
    if (!address) return;
    try {
      const [keysStatus, agentsData, positionsData, tradesData, account, jobs] = await Promise.all([
        futuresService.getApiKeysStatus(address),
        futuresService.getAgents(address),
        futuresService.getPositions(address),
        futuresService.getTrades(address, 100),
        futuresService.getAccountInfo(address),
        futuresService.getSignalJobs(address),
      ]);
      setHasApiKeys(keysStatus.hasApiKeys);
      if (keysStatus.networkMode) {
        setNetworkMode(keysStatus.networkMode);
      }
      setAgents(agentsData);
      setPositions(positionsData);
      setTrades(tradesData);
      setAccountInfo(account);
      setSignalJobs(jobs);
    } catch (e) {
      console.error(e);
    }
  };

  const classicAgent = agents.find(a => a.type === 'classic');
  const customAgents = agents.filter(a => a.type === 'custom');

  return (
    <div className="space-y-6">
      <GatedContent userTier={tier} requiredTier={TIERS.DIAMOND}>
        {/* Network Mode Banner */}
        {networkMode === 'mainnet' ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
            <Globe className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-green-400 font-semibold text-sm flex items-center gap-2">
                Mainnet Mode
                <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">LIVE</span>
              </h3>
              <p className="text-green-200/70 text-sm mt-1">
                You are trading with <span className="font-bold text-green-300">real funds</span> on Hyperliquid mainnet. 
                All trades will be executed on the live network. Trade responsibly.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                Testnet Mode
                <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">PAPER</span>
              </h3>
              <p className="text-amber-200/70 text-sm mt-1">
                This is a paper trading environment. Hyperliquid testnet prices may be unstable and 
                inaccurate compared to mainnet. No real funds are at risk.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-cyan-500" />
              Futures Terminal
              {networkMode === 'mainnet' && (
                <span className="px-2 py-0.5 text-xs bg-green-500 text-black font-bold rounded-full animate-pulse">MAINNET</span>
              )}
            </h2>
            <p className="text-gray-400 mt-1">
              AI-powered Hyperliquid perpetuals trading ({networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'}) • Up to 50x leverage
            </p>
          </div>
          {accountInfo && (
            <div className="text-right hidden md:block">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Account Equity</div>
              <div className="text-2xl font-bold text-white font-mono">${accountInfo.equity.toFixed(2)}</div>
              <div className={`text-sm font-mono ${accountInfo.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {accountInfo.unrealizedPnl >= 0 ? '+' : ''}{accountInfo.unrealizedPnl.toFixed(2)} USDT
              </div>
            </div>
          )}
        </div>

        {/* API Keys Section */}
        {!hasApiKeys ? (
          <ApiKeySetup address={address!} networkMode={networkMode} setNetworkMode={setNetworkMode} onComplete={() => { setHasApiKeys(true); loadData(); }} />
        ) : (
          <>
            {/* Classic Agent */}
            <ClassicAgentCard 
              agent={classicAgent} 
              address={address!}
              onUpdate={loadData}
              onCreate={() => { setEditingAgent(null); setShowAgentModal(true); }}
            />

            {/* Custom Agents Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Custom Agents
                </h2>
                <button
                  onClick={() => { setEditingAgent(null); setShowAgentModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Create Agent
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customAgents.map(agent => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    address={address!}
                    onUpdate={loadData}
                    onEdit={() => { setEditingAgent(agent); setShowAgentModal(true); }}
                  />
                ))}
                {customAgents.length === 0 && (
                  <div className="col-span-full p-8 text-center border border-dashed border-gray-800 rounded-xl">
                    <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500">No custom agents yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Signal Processing Status */}
            <SignalJobsPanel jobs={signalJobs} agents={agents} />

            {/* Live Positions */}
            <PositionsPanel positions={positions} address={address!} onUpdate={loadData} />

            {/* Trade History & Analysis */}
            <TradeHistoryPanel trades={trades} agents={agents} />

            {/* Emergency Button */}
            <EmergencyPanel address={address!} onUpdate={loadData} />
          </>
        )}
      </GatedContent>

      {/* Modals */}
      <AgentModal 
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        agent={editingAgent}
        address={address!}
        onSave={loadData}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ApiKeySetup({ address, networkMode, setNetworkMode, onComplete }: { 
  address: string; 
  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
  onComplete: () => void;
}) {
  const [hyperliquidWallet, setHyperliquidWallet] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!hyperliquidWallet || !privateKey) return;
    setIsLoading(true);
    setError('');
    
    // address = connected wallet (for DB lookup)
    // hyperliquidWallet = the Hyperliquid wallet address user entered
    // privateKey = the private key for the Hyperliquid wallet
    // networkMode = mainnet or testnet
    const result = await futuresService.saveApiKeys(address, hyperliquidWallet, privateKey, networkMode);
    
    if (result.success) {
      toast.success(`Connected to Hyperliquid ${networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'}!`);
      onComplete();
    } else {
      setError(result.error || 'Failed to save API keys');
    }
    setIsLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Connection Form */}
      <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-lg ${networkMode === 'mainnet' ? 'bg-green-500/10 border border-green-500/30' : 'bg-cyan-500/10 border border-cyan-500/30'}`}>
            {networkMode === 'mainnet' ? (
              <Globe className="w-6 h-6 text-green-400" />
            ) : (
              <FlaskConical className="w-6 h-6 text-cyan-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Connect Hyperliquid Wallet</h2>
            <p className="text-gray-400 text-sm mt-1">
              Enter your wallet credentials for {networkMode === 'mainnet' ? 'mainnet' : 'testnet'} trading.
            </p>
          </div>
        </div>

        {/* Network Mode Toggle */}
        <div className="mb-6">
          <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Network Mode</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-800">
            <button
              onClick={() => setNetworkMode('testnet')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                networkMode === 'testnet' 
                  ? 'bg-amber-500/20 text-amber-400 border-r border-amber-500/30' 
                  : 'bg-gray-900 text-gray-500 hover:text-gray-300 border-r border-gray-800'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              Testnet (Paper)
            </button>
            <button
              onClick={() => setNetworkMode('mainnet')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                networkMode === 'mainnet' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-900 text-gray-500 hover:text-gray-300'
              }`}
            >
              <Globe className="w-4 h-4" />
              Mainnet (Real $)
            </button>
          </div>
          {networkMode === 'mainnet' && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Warning: You will be trading with real funds!
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Hyperliquid Wallet Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={hyperliquidWallet}
              onChange={e => setHyperliquidWallet(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-gray-800 text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Private Key</label>
            <input
              type="password"
              placeholder="Enter private key for the wallet above"
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-gray-800 text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none font-mono text-sm"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !hyperliquidWallet || !privateKey}
            className={`w-full py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              networkMode === 'mainnet'
                ? 'bg-green-500 text-black hover:bg-green-400'
                : 'bg-cyan-500 text-black hover:bg-cyan-400'
            }`}
          >
            {isLoading ? 'Connecting...' : `Connect to ${networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'}`}
          </button>
        </div>
      </div>

      {/* Right: Setup Instructions */}
      <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Setup Instructions</h3>
        
        {networkMode === 'testnet' ? (
          <>
            <ol className="text-sm text-gray-400 space-y-3 list-decimal list-inside">
              <li>Go to <a href="https://app.hyperliquid-testnet.xyz" target="_blank" className="text-cyan-400 hover:underline">Hyperliquid Testnet</a></li>
              <li>Connect your wallet and get testnet funds from the faucet</li>
              <li>Export your wallet's private key from MetaMask or your wallet</li>
              <li>Enter your wallet address (0x...) and private key</li>
              <li><span className="text-red-400 font-bold">WARNING:</span> Use a dedicated trading wallet, not your main wallet</li>
              <li>Your keys are encrypted and stored securely for trade execution</li>
            </ol>
            
            <div className="mt-6 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-400/80">
                <span className="font-bold">Testnet Mode:</span> This terminal uses Hyperliquid testnet. No real funds are at risk during testing.
              </p>
            </div>
          </>
        ) : (
          <>
            <ol className="text-sm text-gray-400 space-y-3 list-decimal list-inside">
              <li>Go to <a href="https://app.hyperliquid.xyz" target="_blank" className="text-green-400 hover:underline">Hyperliquid Mainnet</a></li>
              <li>Connect your wallet and deposit USDC (bridge from Arbitrum, min 5 USDC)</li>
              <li>Export your wallet's private key from MetaMask or your wallet</li>
              <li>Enter your wallet address (0x...) and private key</li>
              <li><span className="text-red-400 font-bold">CRITICAL:</span> Use a dedicated trading wallet with only funds you can afford to lose</li>
              <li>Your keys are encrypted and stored securely for trade execution</li>
            </ol>
            
            <div className="mt-6 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-xs text-red-400/80">
                <span className="font-bold">⚠️ MAINNET WARNING:</span> You are connecting to the live Hyperliquid network. 
                All trades will use REAL funds. Only trade with money you can afford to lose. DYOR.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ClassicAgentCard({ agent, address, onUpdate, onCreate }: { 
  agent?: FuturesAgent; address: string; onUpdate: () => void; onCreate: () => void;
}) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (!agent) return;
    setIsToggling(true);
    await futuresService.toggleAgent(address, agent.id, !agent.is_active);
    onUpdate();
    setIsToggling(false);
    toast.success(agent.is_active ? 'Classic Agent deactivated' : 'Classic Agent activated!');
  };

  if (!agent) {
    return (
      <div className="p-6 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 cursor-pointer hover:bg-cyan-500/10 transition-all" onClick={onCreate}>
        <div className="flex items-center justify-center gap-3 text-cyan-400">
          <Plus className="w-6 h-6" />
          <span className="font-bold">Create Classic Rogue Agent</span>
        </div>
        <p className="text-center text-gray-500 text-sm mt-2">Auto-copy all Rogue signals with 1% risk</p>
      </div>
    );
  }

  const winRate = agent.stats.total_trades > 0 
    ? ((agent.stats.winning_trades / agent.stats.total_trades) * 100).toFixed(1)
    : '0';

  return (
    <div className={`relative overflow-hidden rounded-xl border ${agent.is_active ? 'border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)]' : 'border-gray-800'} bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6`}>
      {agent.is_active && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 animate-pulse" />
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${agent.is_active ? 'bg-cyan-500/20' : 'bg-gray-800'}`}>
            <Zap className={`w-5 h-5 ${agent.is_active ? 'text-cyan-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-bold text-white">Classic Rogue Agent</h3>
            <p className="text-xs text-gray-500">Auto-copy all signals</p>
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`relative w-14 h-7 rounded-full transition-all ${agent.is_active ? 'bg-cyan-500' : 'bg-gray-700'}`}
        >
          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${agent.is_active ? 'left-8' : 'left-1'}`} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-500 uppercase">Win Rate</div>
          <div className="text-lg font-bold text-white">{winRate}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Total P&L</div>
          <div className={`text-lg font-bold ${agent.stats.total_pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${agent.stats.total_pnl_usd.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Trades</div>
          <div className="text-lg font-bold text-white">{agent.stats.total_trades}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Today</div>
          <div className="text-lg font-bold text-cyan-400">{agent.stats.trades_today}</div>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, address, onUpdate, onEdit }: { 
  agent: FuturesAgent; address: string; onUpdate: () => void; onEdit: () => void;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    await futuresService.toggleAgent(address, agent.id, !agent.is_active);
    onUpdate();
    setIsToggling(false);
  };

  const handleDuplicate = async () => {
    await futuresService.duplicateAgent(address, agent.id);
    onUpdate();
    toast.success('Agent duplicated!');
  };

  const handleDelete = async () => {
    await futuresService.deleteAgent(address, agent.id);
    onUpdate();
    toast.success('Agent deleted');
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className={`relative rounded-xl border ${agent.is_active ? 'border-purple-500/50' : 'border-gray-800'} bg-gray-900/50 p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white truncate">{agent.name}</h3>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`p-1.5 rounded-lg ${agent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-500 mb-3 line-clamp-2 h-8">{agent.custom_prompt || 'No custom rules'}</div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{agent.risk_per_trade}% risk • {agent.max_leverage}x max</span>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 hover:bg-gray-800 rounded"><Settings className="w-3.5 h-3.5 text-gray-500" /></button>
            <button onClick={handleDuplicate} className="p-1.5 hover:bg-gray-800 rounded"><Copy className="w-3.5 h-3.5 text-gray-500" /></button>
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 hover:bg-gray-800 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Agent
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="text-white font-medium">"{agent.name}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white">
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PositionsPanel({ positions, address, onUpdate }: { 
  positions: FuturesPosition[]; address: string; onUpdate: () => void;
}) {
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);

  const handleClose = async (symbol: string) => {
    await futuresService.closePosition(address, symbol);
    onUpdate();
    toast.success(`${symbol} position closed`);
    setClosingSymbol(null);
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Live Positions ({positions.length})
        </h2>

        {positions.length === 0 ? (
          <div className="p-8 text-center border border-gray-800 rounded-xl">
            <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No open positions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="text-left p-3">Symbol</th>
                  <th className="text-center p-3">Side</th>
                  <th className="text-right p-3">Size</th>
                  <th className="text-right p-3">Entry</th>
                  <th className="text-right p-3">Mark</th>
                  <th className="text-right p-3">PnL</th>
                  <th className="text-right p-3">Liq</th>
                  <th className="text-center p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr key={pos.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                    <td className="p-3 font-mono font-bold text-white">{pos.symbol}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${pos.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pos.direction} {pos.leverage}x
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{pos.quantity}</td>
                    <td className="p-3 text-right font-mono">${pos.entry_price.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono">${pos.current_price.toFixed(4)}</td>
                    <td className={`p-3 text-right font-mono font-bold ${pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl.toFixed(2)}
                      <span className="text-xs ml-1">({pos.unrealized_pnl_percent.toFixed(1)}%)</span>
                    </td>
                    <td className="p-3 text-right font-mono text-orange-400">${pos.liquidation_price.toFixed(4)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => setClosingSymbol(pos.symbol)} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!closingSymbol} onOpenChange={() => setClosingSymbol(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-orange-400" />
              Close Position
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close your <span className="text-white font-medium">{closingSymbol}</span> position? This will execute a market order immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => closingSymbol && handleClose(closingSymbol)} className="bg-orange-600 hover:bg-orange-500 text-white">
              Close Position
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE HISTORY & ANALYSIS
// Detailed breakdown of all trades with performance metrics
// ═══════════════════════════════════════════════════════════════════════════════

function TradeHistoryPanel({ trades, agents }: { trades: FuturesTrade[]; agents: FuturesAgent[] }) {
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'winners' | 'losers'>('all');

  // Get agent name by ID
  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  // Filter trades
  const filteredTrades = trades.filter(trade => {
    switch (filter) {
      case 'open': return trade.status === 'open';
      case 'closed': return trade.status !== 'open';
      case 'winners': return (trade.pnl_usd || 0) > 0;
      case 'losers': return (trade.pnl_usd || 0) < 0;
      default: return true;
    }
  });

  // Calculate summary stats
  const closedTrades = trades.filter(t => t.status !== 'open');
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const winningTrades = closedTrades.filter(t => (t.pnl_usd || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl_usd || 0) < 0);
  const winRate = closedTrades.length > 0 ? ((winningTrades.length / closedTrades.length) * 100).toFixed(1) : '0';
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + (t.pnl_usd || 0), 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + (t.pnl_usd || 0), 0)) / losingTrades.length : 0;
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;
  const bestTrade = closedTrades.length > 0 ? closedTrades.reduce((best, t) => (t.pnl_usd || 0) > (best.pnl_usd || 0) ? t : best, closedTrades[0]) : null;
  const worstTrade = closedTrades.length > 0 ? closedTrades.reduce((worst, t) => (t.pnl_usd || 0) < (worst.pnl_usd || 0) ? t : worst, closedTrades[0]) : null;

  // Status badge component
  const StatusBadge = ({ status }: { status: FuturesTrade['status'] }) => {
    const configs: Record<FuturesTrade['status'], { icon: React.ReactNode; text: string; class: string }> = {
      'open': { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Open', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'tp_hit': { icon: <CheckCircle2 className="w-3 h-3" />, text: 'TP Hit', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      'sl_hit': { icon: <XCircle className="w-3 h-3" />, text: 'SL Hit', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
      'closed': { icon: <CheckCircle2 className="w-3 h-3" />, text: 'Closed', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
      'error': { icon: <AlertOctagon className="w-3 h-3" />, text: 'Error', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    };
    const config = configs[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.class}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  // Format date nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Calculate trade duration
  const calculateDuration = (openedAt: string, closedAt: string | null) => {
    if (!closedAt) return 'Ongoing';
    const start = new Date(openedAt).getTime();
    const end = new Date(closedAt).getTime();
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header with summary stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-amber-400" />
          Trade History & Analysis ({trades.length})
        </h2>
        
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'closed', 'winners', 'losers'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filter === f 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' 
                  : 'bg-gray-800/50 text-gray-500 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'open' ? '● Open' : f === 'closed' ? 'Closed' : f === 'winners' ? '🏆 Winners' : '📉 Losers'}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Summary Cards */}
      {closedTrades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total P&L
            </div>
            <div className={`text-xl font-bold font-mono ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Win Rate</div>
            <div className="text-xl font-bold text-white">{winRate}%</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Profit Factor</div>
            <div className={`text-xl font-bold ${profitFactor >= 1.5 ? 'text-emerald-400' : profitFactor >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
              {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Win</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">+{avgWin.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Loss</div>
            <div className="text-xl font-bold text-red-400 font-mono">-{avgLoss.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider">W / L</div>
            <div className="text-xl font-bold text-white">
              <span className="text-emerald-400">{winningTrades.length}</span>
              <span className="text-gray-600 mx-1">/</span>
              <span className="text-red-400">{losingTrades.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Best & Worst Trade Highlights */}
      {bestTrade && worstTrade && (bestTrade.pnl_usd !== 0 || worstTrade.pnl_usd !== 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-emerald-400/70 uppercase tracking-wider">Best Trade</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-white">{bestTrade.symbol}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${bestTrade.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {bestTrade.direction}
                </span>
                <span className="font-mono font-bold text-emerald-400">+${(bestTrade.pnl_usd || 0).toFixed(2)}</span>
                <span className="text-xs text-emerald-400/70">(+{(bestTrade.pnl_percent || 0).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-red-400/70 uppercase tracking-wider">Worst Trade</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-white">{worstTrade.symbol}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${worstTrade.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {worstTrade.direction}
                </span>
                <span className="font-mono font-bold text-red-400">${(worstTrade.pnl_usd || 0).toFixed(2)}</span>
                <span className="text-xs text-red-400/70">({(worstTrade.pnl_percent || 0).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trades Table */}
      {filteredTrades.length === 0 ? (
        <div className="p-8 text-center border border-gray-800 rounded-xl">
          <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">{filter === 'all' ? 'No trades yet' : `No ${filter} trades`}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase bg-gray-900/80">
                  <th className="text-left p-3 pl-4">Asset</th>
                  <th className="text-center p-3">Side</th>
                  <th className="text-right p-3">Entry</th>
                  <th className="text-right p-3">Exit</th>
                  <th className="text-right p-3">P&L</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Agent</th>
                  <th className="text-right p-3 pr-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(trade => (
                  <>
                    <tr 
                      key={trade.id} 
                      onClick={() => setExpandedTradeId(expandedTradeId === trade.id ? null : trade.id)}
                      className={`border-t border-gray-800/50 hover:bg-gray-900/50 cursor-pointer transition-colors ${expandedTradeId === trade.id ? 'bg-gray-900/70' : ''}`}
                    >
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2">
                          {expandedTradeId === trade.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          )}
                          <span className="font-mono font-bold text-white">{trade.symbol}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${trade.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.direction} {trade.leverage}x
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-gray-300">${trade.entry_price.toFixed(4)}</td>
                      <td className="p-3 text-right font-mono text-gray-300">
                        {trade.exit_price ? `$${trade.exit_price.toFixed(4)}` : '—'}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold ${(trade.pnl_usd || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.pnl_usd !== null ? (
                          <>
                            {trade.pnl_usd >= 0 ? '+' : ''}{trade.pnl_usd.toFixed(2)}
                            <span className="text-xs ml-1 opacity-70">({(trade.pnl_percent || 0).toFixed(1)}%)</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <StatusBadge status={trade.status} />
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs text-gray-500 truncate max-w-[100px] inline-block">{getAgentName(trade.agent_id)}</span>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{formatDate(trade.opened_at)}</span>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    <AnimatePresence>
                      {expandedTradeId === trade.id && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-gradient-to-r from-gray-900/80 via-gray-900/50 to-gray-900/80 border-t border-gray-800/50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <div className="text-gray-500 uppercase tracking-wider mb-1">Signal ID</div>
                                    <div className="text-white font-mono text-sm">{trade.signal_id.slice(0, 12)}...</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 uppercase tracking-wider mb-1">Quantity</div>
                                    <div className="text-white font-mono text-sm">{trade.quantity}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 uppercase tracking-wider mb-1">Risk Used</div>
                                    <div className="text-amber-400 font-mono text-sm">{trade.risk_percent}%</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 uppercase tracking-wider mb-1">Duration</div>
                                    <div className="text-white text-sm">{calculateDuration(trade.opened_at, trade.closed_at)}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 uppercase tracking-wider mb-1">Opened</div>
                                    <div className="text-gray-400 text-sm">{new Date(trade.opened_at).toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 uppercase tracking-wider mb-1">Closed</div>
                                    <div className="text-gray-400 text-sm">{trade.closed_at ? new Date(trade.closed_at).toLocaleString() : 'Still Open'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 uppercase tracking-wider mb-1">Order IDs</div>
                                    <div className="text-gray-400 font-mono text-sm truncate">
                                      Entry: {trade.entry_order_id?.slice(0, 8) || 'N/A'}...
                                    </div>
                                  </div>
                                  {trade.error_message && (
                                    <div className="col-span-2 md:col-span-4">
                                      <div className="text-red-500 uppercase tracking-wider mb-1">Error</div>
                                      <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{trade.error_message}</div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Trade Performance Bar */}
                                {trade.pnl_percent !== null && (
                                  <div className="mt-4 pt-4 border-t border-gray-800/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-gray-500">Performance</span>
                                      <span className={`text-xs font-mono ${(trade.pnl_percent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                                      </span>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all rounded-full ${trade.pnl_percent >= 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                                        style={{ 
                                          width: `${Math.min(100, Math.abs(trade.pnl_percent) * 5)}%`,
                                          marginLeft: trade.pnl_percent < 0 ? 'auto' : 0 
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EmergencyPanel({ address, onUpdate }: { address: string; onUpdate: () => void }) {
  const [isClosing, setIsClosing] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  const handleEmergency = async () => {
    setIsClosing(true);
    const result = await futuresService.emergencyCloseAll(address);
    onUpdate();
    setIsClosing(false);
    setShowEmergencyConfirm(false);
    toast.success(`Closed ${result.closed.length} positions`);
  };

  return (
    <>
      <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
        <button
          onClick={() => setShowEmergencyConfirm(true)}
          disabled={isClosing}
          className="w-full py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          {isClosing ? 'CLOSING ALL...' : 'EMERGENCY: CLOSE ALL POSITIONS'}
        </button>
      </div>

      <AlertDialog open={showEmergencyConfirm} onOpenChange={setShowEmergencyConfirm}>
        <AlertDialogContent className="border-red-500/50">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Emergency Close All
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This will immediately close <span className="text-white font-semibold">ALL</span> open positions and deactivate <span className="text-white font-semibold">ALL</span> trading agents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmergency} className="bg-red-600 hover:bg-red-500 text-white">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Confirm Emergency Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AgentModal({ isOpen, onClose, agent, address, onSave }: {
  isOpen: boolean; onClose: () => void; agent: FuturesAgent | null; address: string; onSave: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'classic' | 'custom'>('custom');
  const [risk, setRisk] = useState(1);
  const [maxPositions, setMaxPositions] = useState(3);
  const [maxLeverage, setMaxLeverage] = useState(20);
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setType(agent.type);
      setRisk(agent.risk_per_trade);
      setMaxPositions(agent.max_concurrent_positions);
      setMaxLeverage(agent.max_leverage);
      setPrompt(agent.custom_prompt || '');
    } else {
      setName('');
      setType('custom');
      setRisk(1);
      setMaxPositions(3);
      setMaxLeverage(20);
      setPrompt('');
    }
  }, [agent, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    if (agent) {
      await futuresService.updateAgent({
        walletAddress: address, agentId: agent.id, name, riskPerTrade: risk,
        maxConcurrentPositions: maxPositions, maxLeverage, customPrompt: prompt,
      });
    } else {
      await futuresService.createAgent({
        walletAddress: address, name: name || (type === 'classic' ? 'Classic Rogue Agent' : 'Custom Agent'),
        type, riskPerTrade: risk, maxConcurrentPositions: maxPositions, maxLeverage, customPrompt: prompt,
      });
    }
    onSave();
    onClose();
    setIsSaving(false);
    toast.success(agent ? 'Agent updated!' : 'Agent created!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{agent ? 'Edit Agent' : 'Create Agent'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {!agent && (
            <div className="flex gap-2">
              <button onClick={() => setType('classic')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'classic' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400'}`}>Classic</button>
              <button onClick={() => setType('custom')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'custom' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}>Custom</button>
            </div>
          )}

          <input value={name} onChange={e => setName(e.target.value)} placeholder="Agent Name" 
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-800 text-white" />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Risk %</label>
              <input type="number" min={0.5} max={5} step={0.5} value={risk} onChange={e => setRisk(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-800 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Positions</label>
              <input type="number" min={1} max={10} value={maxPositions} onChange={e => setMaxPositions(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-800 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Leverage</label>
              <input type="number" min={1} max={100} value={maxLeverage} onChange={e => setMaxLeverage(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-800 text-white" />
              <p className="text-xs text-gray-600 mt-1">Actual max depends on asset (e.g., BTC: 50x, memecoins: 3-5x)</p>
            </div>
          </div>

          {type === 'custom' && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Custom Rules (Natural Language)</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                placeholder="e.g., Only trade AI tokens with confidence >8. Never trade memecoins."
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-800 text-white text-sm" />
            </div>
          )}

          <button onClick={handleSave} disabled={isSaving}
            className="w-full py-3 rounded-lg bg-cyan-500 text-black font-bold hover:bg-cyan-400 disabled:opacity-50">
            {isSaving ? 'Saving...' : (agent ? 'Update Agent' : 'Create Agent')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL JOBS PANEL - Shows background processing status for custom agents
// ═══════════════════════════════════════════════════════════════════════════════

function SignalJobsPanel({ jobs, agents }: { 
  jobs: { active: SignalJob[]; recent: SignalJob[] }; 
  agents: FuturesAgent[];
}) {
  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  const getStatusIcon = (status: SignalJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'skipped':
        return <AlertOctagon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: SignalJob['status']) => {
    switch (status) {
      case 'pending': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'processing': return 'border-cyan-500/30 bg-cyan-500/5';
      case 'completed': return 'border-green-500/30 bg-green-500/5';
      case 'failed': return 'border-red-500/30 bg-red-500/5';
      case 'skipped': return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Combine and sort all jobs by created_at
  const allJobs = [...jobs.active, ...jobs.recent].slice(0, 10);

  if (allJobs.length === 0) {
    return null; // Don't show panel if no jobs
  }

  const hasActiveJobs = jobs.active.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Cpu className="w-5 h-5 text-purple-400" />
        Signal Processing
        {hasActiveJobs && (
          <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full animate-pulse">
            {jobs.active.length} Active
          </span>
        )}
      </h2>

      <div className="grid gap-3">
        <AnimatePresence mode="popLayout">
          {allJobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-xl border ${getStatusColor(job.status)} transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(job.status)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">
                        {job.signal_data.token.symbol}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                        {getAgentName(job.agent_id)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Entry: ${job.signal_data.entry_price.toFixed(4)} → Target: ${job.signal_data.target_price.toFixed(4)}
                    </div>
                    {job.evaluation_reason && (
                      <div className="text-xs text-gray-400 mt-2 flex items-start gap-1">
                        <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5 text-purple-400" />
                        <span className="line-clamp-2">{job.evaluation_reason}</span>
                      </div>
                    )}
                    {job.trade_error && (
                      <div className="text-xs text-red-400 mt-2">
                        ⚠️ {job.trade_error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-gray-500">
                    {formatTime(job.created_at)}
                  </div>
                  {job.status === 'processing' && (
                    <div className="text-xs text-cyan-400 mt-1">
                      AI Evaluating...
                    </div>
                  )}
                  {job.status === 'completed' && job.should_trade && (
                    <div className="text-xs text-green-400 mt-1">
                      Trade Placed ✓
                    </div>
                  )}
                  {job.status === 'skipped' && (
                    <div className="text-xs text-gray-400 mt-1">
                      Skipped
                    </div>
                  )}
                  {job.evaluation_confidence !== null && (
                    <div className="text-xs text-gray-500 mt-1">
                      {job.evaluation_confidence}% confidence
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
