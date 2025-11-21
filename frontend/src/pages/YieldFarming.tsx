import { motion } from 'framer-motion';
import { useYield, YieldOpportunity } from '../hooks/useYield';
import { Loader2, ExternalLink } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Coins01Icon } from '@hugeicons/core-free-icons';

export function YieldFarming() {
  const { data: opportunities, isLoading, isError } = useYield();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] text-red-500">
        Failed to load yield opportunities.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={Coins01Icon} className="w-6 h-6 text-cyan-500" />
            Yield Farming
          </h2>
          <p className="text-gray-400 mt-1">High-yield opportunities curated by AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {opportunities?.map((opp, index) => (
          <YieldCard key={opp.pool_id || index} opportunity={opp} index={index} />
        ))}
      </div>
    </div>
  );
}

function YieldCard({ opportunity, index }: { opportunity: YieldOpportunity; index: number }) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400 border-green-400/20 bg-green-400/10';
      case 'Medium': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
      case 'High': return 'text-orange-400 border-orange-400/20 bg-orange-400/10';
      case 'Degen': return 'text-red-500 border-red-500/20 bg-red-500/10';
      default: return 'text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/30 transition-colors group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
            {opportunity.protocol}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
            <span className="uppercase px-2 py-0.5 rounded bg-gray-800 text-xs font-medium">
              {opportunity.chain}
            </span>
            <span>{opportunity.symbol}</span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold border ${getRiskColor(opportunity.risk_level)}`}>
          {opportunity.risk_level}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 p-3 rounded-lg">
          <div className="text-gray-500 text-xs mb-1">APY</div>
          <div className="text-xl font-bold text-green-400">{opportunity.apy.toFixed(2)}%</div>
        </div>
        <div className="bg-black/20 p-3 rounded-lg">
          <div className="text-gray-500 text-xs mb-1">TVL</div>
          <div className="text-lg font-semibold text-white">
            ${new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(opportunity.tvl)}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-4 line-clamp-3">
        {opportunity.analysis}
      </p>

      {opportunity.url && (
        <a
          href={opportunity.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
        >
          View Pool <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}
