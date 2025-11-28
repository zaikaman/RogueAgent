import { motion } from 'framer-motion';
import { useConnect } from 'wagmi';
import { usePredictions, PredictionMarket } from '../hooks/usePredictions';
import { useUserTier } from '../hooks/useUserTier';
import { GatedContent } from '../components/GatedContent';
import { TIERS } from '../constants/tiers';
import { Loader2, ExternalLink, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartHistogramIcon } from '@hugeicons/core-free-icons';

export function PredictionsPage() {
  const { data, isLoading, isError } = usePredictions();
  const { tier, isConnected, isLoading: isTierLoading } = useUserTier();
  const { connect, connectors } = useConnect();

  const markets = data?.markets || [];

  const handleConnect = () => {
    const connector = connectors[0];
    connect({ connector });
  };

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
        Failed to load prediction markets.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={ChartHistogramIcon} className="w-6 h-6 text-cyan-500" />
            Prediction Markets
          </h2>
          <p className="text-gray-400 mt-1">High-edge betting opportunities with +12% edge or higher.</p>
        </div>
      </div>

      {/* First Market - Visible to all */}
      {markets && markets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Featured Market</h3>
          <MarketCard market={markets[0]} index={0} featured />
        </div>
      )}

      {/* Remaining Markets - Gated for Diamond */}
      {markets && markets.length > 1 && (
        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.DIAMOND}
          onConnect={!isConnected ? handleConnect : undefined}
          isLoading={isTierLoading}
        >
          <div className="space-y-4 pt-8 border-t border-gray-800">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">More Opportunities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.slice(1).map((market, index) => (
                <MarketCard key={market.market_id || index + 1} market={market} index={index + 1} />
              ))}
            </div>
          </div>
        </GatedContent>
      )}

      {/* No Markets Fallback - Auto scan triggered by backend */}
      {markets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8 bg-gray-900/50 border border-gray-800 rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Scanning for High-Edge Markets</h3>
          <p className="text-gray-400 text-center max-w-md">
            The AI is actively scanning prediction markets for opportunities with +12% edge or higher.
            This page will update automatically once data is available.
          </p>
        </div>
      )}
    </div>
  );
}

function MarketCard({ market, index, featured = false }: { market: PredictionMarket; index: number; featured?: boolean }) {
  const isLongBet = market.recommended_bet === 'BUY YES';
  
  const getEdgeColor = (edge: number) => {
    if (edge >= 25) return 'text-green-400 border-green-400/20 bg-green-400/10';
    if (edge >= 18) return 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10';
    if (edge >= 12) return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
    return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
  };

  const getPlatformBadge = (platform: string) => {
    const styles: Record<string, string> = {
      'Polymarket': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'Azuro': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'SX Network': 'bg-green-500/10 text-green-400 border-green-500/20',
      'Degen': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };
    return styles[platform] || 'bg-gray-800 text-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/30 transition-colors group flex flex-col h-full ${featured ? 'border-cyan-500/30 bg-cyan-900/5' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
            {market.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
            <span className={`uppercase px-2 py-0.5 rounded text-xs font-medium border ${getPlatformBadge(market.platform)}`}>
              {market.platform}
            </span>
            {market.expiration_date && (
              <span className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {new Date(market.expiration_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold border ${getEdgeColor(market.edge_percent)}`}>
          +{market.edge_percent.toFixed(1)}% Edge
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 p-3 rounded-lg">
          <div className="text-gray-500 text-xs mb-1">Yes Price</div>
          <div className="text-xl font-bold text-white">{(market.yes_price * 100).toFixed(0)}¢</div>
          <div className="text-xs text-gray-500">{market.implied_probability.toFixed(0)}% implied</div>
        </div>
        <div className="bg-black/20 p-3 rounded-lg">
          <div className="text-gray-500 text-xs mb-1">Rogue Probability</div>
          <div className="text-xl font-bold text-cyan-400">{market.rogue_probability.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">{market.confidence_score}/100 confidence</div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${isLongBet ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
        {isLongBet ? (
          <TrendingUp className="w-5 h-5 text-green-400" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-400" />
        )}
        <div>
          <div className={`text-sm font-bold ${isLongBet ? 'text-green-400' : 'text-red-400'}`}>
            {market.recommended_bet}
          </div>
          {market.analysis_reasoning && (
            <div className="text-xs text-gray-400 line-clamp-2">{market.analysis_reasoning}</div>
          )}
        </div>
      </div>

      {market.market_url && (
        <a
          href={market.market_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-400 transition-colors mt-auto"
        >
          Bet Now <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}
