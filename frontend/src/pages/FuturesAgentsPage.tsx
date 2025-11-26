import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUserTier } from '../hooks/useUserTier';
import { futuresService } from '../services/futures.service';
import { TIERS } from '../constants/tiers';
import { GatedContent } from '../components/GatedContent';
import { FuturesAgent, FuturesPosition, FuturesAccountInfo } from '../types/futures.types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Zap, Power, Plus, Settings, Trash2, Copy, 
  TrendingUp, AlertTriangle, X,
  Shield, Bot, Target, Activity
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
// Diamond-only Hyperliquid Perpetual Futures automated trading terminal (Testnet)
// ═══════════════════════════════════════════════════════════════════════════════

export function FuturesAgentsPage() {
  const { address } = useAccount();
  const { tier } = useUserTier();
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [agents, setAgents] = useState<FuturesAgent[]>([]);
  const [positions, setPositions] = useState<FuturesPosition[]>([]);
  const [accountInfo, setAccountInfo] = useState<FuturesAccountInfo | null>(null);
  
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<FuturesAgent | null>(null);

  // Load data
  useEffect(() => {
    if (!address) return;
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [address]);

  const loadData = async () => {
    if (!address) return;
    try {
      const [keysStatus, agentsData, positionsData, account] = await Promise.all([
        futuresService.getApiKeysStatus(address),
        futuresService.getAgents(address),
        futuresService.getPositions(address),
        futuresService.getAccountInfo(address),
      ]);
      setHasApiKeys(keysStatus.hasApiKeys);
      setAgents(agentsData);
      setPositions(positionsData);
      setAccountInfo(account);
    } catch (e) {
      console.error(e);
    }
  };

  const classicAgent = agents.find(a => a.type === 'classic');
  const customAgents = agents.filter(a => a.type === 'custom');

  return (
    <div className="space-y-6">
      <GatedContent userTier={tier} requiredTier={TIERS.DIAMOND}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-cyan-500" />
              Futures Terminal
            </h2>
            <p className="text-gray-400 mt-1">AI-powered Hyperliquid perpetuals trading (Testnet) • Up to 50x leverage</p>
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
          <ApiKeySetup address={address!} onComplete={() => { setHasApiKeys(true); loadData(); }} />
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

            {/* Live Positions */}
            <PositionsPanel positions={positions} address={address!} onUpdate={loadData} />

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

function ApiKeySetup({ address, onComplete }: { address: string; onComplete: () => void }) {
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
    const result = await futuresService.saveApiKeys(address, hyperliquidWallet, privateKey);
    
    if (result.success) {
      toast.success('API keys connected successfully!');
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
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Connect Hyperliquid Wallet</h2>
            <p className="text-gray-400 text-sm mt-1">
              Enter your wallet credentials for testnet trading.
            </p>
          </div>
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
            className="w-full py-3 rounded-lg bg-cyan-500 text-black font-bold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Connecting...' : 'Connect & Test'}
          </button>
        </div>
      </div>

      {/* Right: Setup Instructions */}
      <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Setup Instructions</h3>
        <ol className="text-sm text-gray-400 space-y-3 list-decimal list-inside">
          <li>Go to <a href="https://app.hyperliquid-testnet.xyz" target="_blank" className="text-cyan-400 hover:underline">Hyperliquid Testnet</a></li>
          <li>Connect your wallet and get testnet funds from the faucet</li>
          <li>Export your wallet's private key from MetaMask or your wallet</li>
          <li>Enter your wallet address (0x...) and private key</li>
          <li><span className="text-red-400 font-bold">WARNING:</span> Use a dedicated trading wallet, not your main wallet</li>
          <li>Your keys are encrypted and stored securely for trade execution</li>
        </ol>
        
        <div className="mt-6 p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-xs text-cyan-400/80">
            <span className="font-bold">Testnet Mode:</span> This terminal uses Hyperliquid testnet. No real funds are at risk during testing.
          </p>
        </div>
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
