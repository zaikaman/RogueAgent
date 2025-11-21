import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MindshareChart } from '../components/MindshareChart';
import { GatedContent } from '../components/GatedContent';
import { walletService } from '../services/wallet.service';
import { useRunStatus } from '../hooks/useRunStatus';
import { TIERS, Tier } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartHistogramIcon } from '@hugeicons/core-free-icons';

export function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const { data: runStatus } = useRunStatus();
  const [userTier, setUserTier] = useState<Tier>(TIERS.NONE);

  useEffect(() => {
    if (isConnected && address) {
      walletService.verifyTier(address)
        .then(data => setUserTier(data.tier))
        .catch(console.error);
    } else {
      setUserTier(TIERS.NONE);
    }
  }, [isConnected, address]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={ChartHistogramIcon} className="w-6 h-6 text-cyan-500" />
            Analytics
          </h2>
          <p className="text-gray-400 mt-1">Market metrics and mindshare velocity tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mindshare Chart */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-bold text-white">Mindshare Velocity</h3>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              SILVER+
            </span>
          </div>
          
          <GatedContent userTier={userTier} requiredTier={TIERS.SILVER}>
            <MindshareChart data={runStatus?.mindshare} />
          </GatedContent>
        </div>

        {/* Placeholder for other analytics */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 flex items-center justify-center min-h-[300px]">
           <div className="text-center">
             <p className="text-gray-500 mb-2">More analytics modules coming soon</p>
             <div className="text-xs text-gray-600 font-mono">MODULE_LOAD_PENDING...</div>
           </div>
        </div>
      </div>
    </div>
  );
}
