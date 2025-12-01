import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useConnect } from 'wagmi';
import { useAllPredictions, PredictionMarket } from '../hooks/usePredictions';
import { useUserTier } from '../hooks/useUserTier';
import { GatedContent } from '../components/GatedContent';
import { SearchAndSort, SortOption, FilterConfig } from '../components/ui/SearchAndSort';
import { TIERS } from '../constants/tiers';
import { Loader2, ExternalLink, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartHistogramIcon, ArrowLeft01Icon, ArrowRight01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const AGENT_AVATAR = '/logo.webp';

const ITEMS_PER_PAGE = 9;

const SORT_OPTIONS: SortOption[] = [
  { value: 'edge-high', label: 'Edge (High)' },
  { value: 'edge-low', label: 'Edge (Low)' },
  { value: 'confidence-high', label: 'Confidence (High)' },
  { value: 'confidence-low', label: 'Confidence (Low)' },
  { value: 'expiration-soon', label: 'Expiring Soon' },
  { value: 'expiration-later', label: 'Expiring Later' },
];

const FILTER_CONFIG: FilterConfig[] = [
  {
    key: 'platform',
    label: 'Platform',
    options: [
      { value: 'all', label: 'All Platforms' },
      { value: 'polymarket', label: 'Polymarket' },
      { value: 'azuro', label: 'Azuro' },
      { value: 'sx network', label: 'SX Network' },
      { value: 'degen', label: 'Degen' },
    ],
  },
  {
    key: 'bet',
    label: 'Recommendation',
    options: [
      { value: 'all', label: 'All' },
      { value: 'buy yes', label: 'Buy Yes' },
      { value: 'buy no', label: 'Buy No' },
      { value: 'hold', label: 'Hold' },
    ],
  },
];

export function PredictionsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('edge-high');
  const [filters, setFilters] = useState<Record<string, string>>({
    platform: 'all',
    bet: 'all',
  });

  const { data, isLoading, isError } = useAllPredictions();
  const { tier, isConnected, isLoading: isTierLoading } = useUserTier();
  const { connect, connectors } = useConnect();

  const allMarkets = data?.markets || [];

  // Reset to page 1 when search/sort/filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy, filters]);

  const handleConnect = () => {
    const connector = connectors[0];
    connect({ connector });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
  };

  // Filter, sort, and paginate logic
  const { featuredMarket, paginatedMarkets, totalPages, totalFiltered } = useMemo(() => {
    // First one is always featured
    const featured = allMarkets.length > 0 ? allMarkets[0] : null;
    const latestId = featured?.market_id;
    let list = allMarkets.filter((m: PredictionMarket) => m.market_id !== latestId);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((m: PredictionMarket) => {
        const title = m.title?.toLowerCase() || '';
        const platform = m.platform?.toLowerCase() || '';
        const reasoning = m.analysis_reasoning?.toLowerCase() || '';
        const category = m.category?.toLowerCase() || '';
        return title.includes(query) || platform.includes(query) || reasoning.includes(query) || category.includes(query);
      });
    }

    // Platform filter
    if (filters.platform !== 'all') {
      list = list.filter((m: PredictionMarket) => {
        return m.platform?.toLowerCase() === filters.platform;
      });
    }

    // Bet recommendation filter
    if (filters.bet !== 'all') {
      list = list.filter((m: PredictionMarket) => {
        return m.recommended_bet?.toLowerCase() === filters.bet;
      });
    }

    // Sort
    list = [...list].sort((a: PredictionMarket, b: PredictionMarket) => {
      switch (sortBy) {
        case 'edge-low':
          return (a.edge_percent || 0) - (b.edge_percent || 0);
        case 'confidence-high':
          return (b.confidence_score || 0) - (a.confidence_score || 0);
        case 'confidence-low':
          return (a.confidence_score || 0) - (b.confidence_score || 0);
        case 'expiration-soon':
          return new Date(a.expiration_date || '2099-01-01').getTime() - new Date(b.expiration_date || '2099-01-01').getTime();
        case 'expiration-later':
          return new Date(b.expiration_date || '1970-01-01').getTime() - new Date(a.expiration_date || '1970-01-01').getTime();
        case 'edge-high':
        default:
          return (b.edge_percent || 0) - (a.edge_percent || 0);
      }
    });

    const totalFiltered = list.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const paginatedMarkets = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { featuredMarket: featured, paginatedMarkets, totalPages, totalFiltered };
  }, [allMarkets, searchQuery, sortBy, filters, page]);

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
      {featuredMarket && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Featured Market</h3>
          <MarketCard market={featuredMarket} index={0} featured />
        </div>
      )}

      {/* Remaining Markets - Gated for Diamond */}
      {allMarkets && allMarkets.length > 1 && (
        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.DIAMOND}
          onConnect={!isConnected ? handleConnect : undefined}
          isLoading={isTierLoading}
        >
          <div className="space-y-4 pt-8 border-t border-gray-800">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">More Opportunities</h3>
              
              <SearchAndSort
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search markets..."
                sortOptions={SORT_OPTIONS}
                currentSort={sortBy}
                onSortChange={setSortBy}
                filters={FILTER_CONFIG}
                activeFilters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>

            {paginatedMarkets.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedMarkets.map((market: PredictionMarket, index: number) => (
                    <MarketCard key={market.market_id || index + 1} market={market} index={index + 1} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                      onClick={handlePrevPage}
                      disabled={page === 1}
                      className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-400 hover:text-white"
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-500">
                      Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
                      <span className="text-gray-600 ml-2">({totalFiltered} total)</span>
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-400 hover:text-white"
                    >
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={ChartHistogramIcon} className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Matching Markets</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>
        </GatedContent>
      )}

      {/* No Markets Fallback - Auto scan triggered by backend */}
      {allMarkets.length === 0 && (
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

  const date = new Date(market.created_at).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

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
          className="inline-flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-400 transition-colors mb-4"
        >
          Bet Now <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* Timestamp Footer */}
      <div className="flex items-center pt-3 border-t border-gray-800 mt-auto">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 border border-gray-700">
            <AvatarImage src={AGENT_AVATAR} />
            <AvatarFallback className="bg-cyan-950 text-cyan-400 text-[10px]">RA</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">Rogue Agent</span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <HugeiconsIcon icon={Calendar01Icon} className="w-3 h-3" />
              {date}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
