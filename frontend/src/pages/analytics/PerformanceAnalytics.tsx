import { useSignalsHistory } from '../../hooks/useSignals';
import { WinRateChart } from '../../components/analytics/WinRateChart';
import { PnLChart } from '../../components/analytics/PnLChart';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartHistogramIcon, AnalyticsUpIcon } from '@hugeicons/core-free-icons';

export function PerformanceAnalytics() {
  const { data: signalsHistory } = useSignalsHistory(1, 100);
  const signals = signalsHistory?.data || [];

  // Calculate summary metrics
  const closedSignals = signals.filter(s => s.content.status === 'tp_hit' || s.content.status === 'sl_hit');
  const totalClosed = closedSignals.length;
  const wins = closedSignals.filter(s => s.content.status === 'tp_hit').length;
  const winRate = totalClosed > 0 ? ((wins / totalClosed) * 100).toFixed(1) : '0.0';
  
  const totalPnL = closedSignals.reduce((acc, s) => acc + (s.content.pnl_percent || 0), 0);
  const avgPnL = totalClosed > 0 ? (totalPnL / totalClosed).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-emerald-400">{winRate}%</div>
        </div>
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Avg PnL per Trade</div>
          <div className={`text-2xl font-bold ${Number(avgPnL) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {Number(avgPnL) > 0 ? '+' : ''}{avgPnL}%
          </div>
        </div>
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Total Closed Signals</div>
          <div className="text-2xl font-bold text-white">{totalClosed}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <HugeiconsIcon icon={ChartHistogramIcon} className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-white">Win/Loss Ratio</h3>
          </div>
          <WinRateChart signals={signals} />
        </div>

        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <HugeiconsIcon icon={AnalyticsUpIcon} className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-white">PnL History</h3>
          </div>
          <PnLChart signals={signals} />
        </div>
      </div>
    </div>
  );
}
