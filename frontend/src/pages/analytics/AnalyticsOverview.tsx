import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MindshareChart } from '../../components/MindshareChart';
import { ActivityChart } from '../../components/analytics/ActivityChart';
import { WinRateChart } from '../../components/analytics/WinRateChart';
import { GatedContent } from '../../components/GatedContent';
import { walletService } from '../../services/wallet.service';
import { useRunStatus } from '../../hooks/useRunStatus';
import { useSignalsHistory } from '../../hooks/useSignals';
import { TIERS, Tier } from '../../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartHistogramIcon, GpsSignal01Icon } from '@hugeicons/core-free-icons';

export function AnalyticsOverview() {
  const { address, isConnected } = useAccount();
  const { data: runStatus } = useRunStatus();
  const { data: signalsHistory } = useSignalsHistory(1, 100);
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

  const signals = signalsHistory?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mindshare Chart */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <HugeiconsIcon icon={ChartHistogramIcon} className="w-5 h-5 text-cyan-500" />
            <h3 className="text-lg font-bold text-white">Mindshare Velocity</h3>
            <span className="ml-auto px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              SILVER+
            </span>
          </div>
          
          <GatedContent userTier={userTier} requiredTier={TIERS.SILVER}>
            <MindshareChart data={runStatus?.mindshare} />
          </GatedContent>
        </div>

        {/* Win Rate (New Highlight) */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <HugeiconsIcon icon={ChartHistogramIcon} className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-white">Performance Overview</h3>
          </div>
          <WinRateChart signals={signals} />
        </div>

        {/* Signal Activity */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="relative">
              <HugeiconsIcon icon={GpsSignal01Icon} className="w-5 h-5 text-emerald-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
            <h3 className="text-lg font-bold text-white">Signal Activity</h3>
            <span className="ml-auto px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ALL TIERS
            </span>
          </div>
          <ActivityChart signals={signals} />
        </div>
      </div>
    </div>
  );
}
