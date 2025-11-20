import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '../components/WalletConnect';
import { TierDisplay } from '../components/TierDisplay';
import { Countdown } from '../components/Countdown';
import { SignalCard } from '../components/SignalCard';
import { IntelThread } from '../components/IntelThread';
import { TerminalLog } from '../components/TerminalLog';
import { MindshareChart } from '../components/MindshareChart';
import { GatedContent } from '../components/GatedContent';
import { TelegramModal } from '../components/TelegramModal';
import { useRunStatus } from '../hooks/useRunStatus';
import { useLogs } from '../hooks/useLogs';
import { walletService } from '../services/wallet.service';
import { TIERS, Tier } from '../constants/tiers';
import { Activity, History } from 'lucide-react';

export function Terminal() {
  const { address, isConnected } = useAccount();
  const { data: runStatus, isLoading: isRunLoading } = useRunStatus();
  const { data: logsData } = useLogs();
  
  const [userTier, setUserTier] = useState<Tier>(TIERS.NONE);
  const [balance, setBalance] = useState(0);
  const [usdValue, setUsdValue] = useState(0);
  const [showTelegramModal, setShowTelegramModal] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      walletService.verifyTier(address)
        .then(data => {
          setUserTier(data.tier);
          setBalance(data.balance);
          setUsdValue(data.usdValue);

          // Show Telegram modal if user is Silver+ and hasn't connected Telegram yet
          if (data.tier !== TIERS.NONE && !data.telegram_connected) {
             setShowTelegramModal(true);
          }
        })
        .catch(console.error);
    } else {
      setUserTier(TIERS.NONE);
      setBalance(0);
      setUsdValue(0);
    }
  }, [isConnected, address]);

  const handleCloseTelegramModal = () => {
    setShowTelegramModal(false);
  };

  const lastRun = runStatus?.last_run;
  const latestSignal = runStatus?.latest_signal;
  const latestIntel = runStatus?.latest_intel;
  const lastRunTime = lastRun?.created_at;

  return (
    <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-cyan-500/30">
      <TelegramModal 
        isOpen={showTelegramModal} 
        onClose={handleCloseTelegramModal} 
        walletAddress={address || ''} 
      />
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20 flex items-center justify-center">
              <img src="/logo.webp" alt="Rogue Terminal" className="h-8 w-8 object-contain rounded" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">ROGUE TERMINAL</h1>
              <div className="text-xs text-cyan-500 font-mono">v1.0.0-alpha</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Countdown 
              lastRunTime={lastRunTime} 
              intervalMinutes={runStatus?.interval_minutes}
            />
            <div className="h-8 w-px bg-gray-800" />
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Top Section: Signal & Tier */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SignalCard signal={latestSignal} isLoading={isRunLoading} />
            
            {/* Mindshare Chart (Gated) */}
            <GatedContent userTier={userTier} requiredTier={TIERS.SILVER}>
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-400 uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  Mindshare Velocity
                </div>
                <MindshareChart data={[]} />
              </div>
            </GatedContent>
          </div>

          <div className="space-y-6">
            <TierDisplay tier={userTier} balance={balance} usdValue={usdValue} />
            <TerminalLog logs={logsData?.data || []} />
          </div>
        </div>

        {/* Intel Thread (Gated) */}
        <GatedContent userTier={userTier} requiredTier={TIERS.GOLD}>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              Latest Intel Thread
            </h2>
            {latestIntel?.content?.formatted_tweet ? (
              <IntelThread content={latestIntel.content.formatted_tweet} />
            ) : (
              <div className="p-8 text-center border border-gray-800 rounded-xl bg-gray-900/30 text-gray-500">
                No intel thread available for the latest run.
              </div>
            )}
          </div>
        </GatedContent>
      </main>
    </div>
  );
}
