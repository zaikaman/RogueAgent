import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import { SignalCard } from '../components/SignalCard';
import { IntelCard } from '../components/IntelCard';
import { TierDisplay } from '../components/TierDisplay';
import { TelegramModal } from '../components/TelegramModal';
import { useRunStatus } from '../hooks/useRunStatus';
import { walletService } from '../services/wallet.service';
import { TIERS, Tier } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Home01Icon } from '@hugeicons/core-free-icons';

export function DashboardHome() {
  const { address, isConnected } = useAccount();
  const { data: runStatus, isLoading: isRunLoading } = useRunStatus();
  
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

  const latestSignal = runStatus?.latest_signal;
  const latestIntel = runStatus?.latest_intel;

  return (
    <div className="space-y-8">
      <TelegramModal 
        isOpen={showTelegramModal} 
        onClose={() => setShowTelegramModal(false)} 
        walletAddress={address || ''} 
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={Home01Icon} className="w-6 h-6 text-cyan-500" />
            Dashboard
          </h2>
          <p className="text-gray-400 mt-1">Overview of your agent status and latest intelligence.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Latest Intel Preview */}
          {latestIntel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Latest Intelligence</h3>
                 <Link to="/app/intel" className="text-xs text-cyan-500 hover:text-cyan-400 flex items-center gap-1">
                   View Feed <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
                 </Link>
              </div>
              <IntelCard intel={latestIntel} />
            </div>
          )}

          {/* Latest Signal Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Latest Signal</h3>
               <Link to="/app/signals" className="text-xs text-cyan-500 hover:text-cyan-400 flex items-center gap-1">
                 View All <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
               </Link>
            </div>
            <SignalCard signal={latestSignal} isLoading={isRunLoading} />
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <TierDisplay 
            tier={userTier} 
            balance={balance} 
            usdValue={usdValue} 
          />
          
          {/* Quick Actions or Status */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Agent Status</span>
                <span className="text-green-400 font-mono">ONLINE</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Network</span>
                <span className="text-cyan-400 font-mono">FRAXTAL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Uptime</span>
                <span className="text-gray-300 font-mono">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
