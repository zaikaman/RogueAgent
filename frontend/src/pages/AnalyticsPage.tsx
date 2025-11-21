import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MindshareChart } from '../components/MindshareChart';
import { GatedContent } from '../components/GatedContent';
import { walletService } from '../services/wallet.service';
import { useRunStatus } from '../hooks/useRunStatus';
import { useSignalsHistory } from '../hooks/useSignals';
import { TIERS, Tier } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  ChartHistogramIcon, 
  GpsSignal01Icon, 
  News01Icon 
} from '@hugeicons/core-free-icons';
import { SignalConfidenceChart } from '../components/analytics/SignalConfidenceChart';
import { TokenFrequencyChart } from '../components/analytics/TokenFrequencyChart';
import { ActivityChart } from '../components/analytics/ActivityChart';

export function AnalyticsPage() {
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

        {/* Signal Activity */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
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

        {/* Confidence Distribution */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <HugeiconsIcon icon={ChartHistogramIcon} className="w-5 h-5 text-cyan-500" />
            <h3 className="text-lg font-bold text-white">Confidence Distribution</h3>
            <span className="ml-auto px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              GOLD+
            </span>
          </div>
          <GatedContent userTier={userTier} requiredTier={TIERS.GOLD}>
             <SignalConfidenceChart signals={signals} />
          </GatedContent>
        </div>

        {/* Top Tokens */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <HugeiconsIcon icon={News01Icon} className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-white">Top Tokens by Frequency</h3>
            <span className="ml-auto px-2 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              GOLD+
            </span>
          </div>
          <GatedContent userTier={userTier} requiredTier={TIERS.GOLD}>
            <TokenFrequencyChart signals={signals} />
          </GatedContent>
        </div>
      </div>
    </div>
  );
}
