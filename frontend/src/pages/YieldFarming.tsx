import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useConnect } from 'wagmi';
import { useAllYield, YieldOpportunity } from '../hooks/useYield';
import { useUserTier } from '../hooks/useUserTier';
import { GatedContent } from '../components/GatedContent';
import { SearchAndSort, SortOption, FilterConfig } from '../components/ui/SearchAndSort';
import { TIERS } from '../constants/tiers';
import { Loader2, ExternalLink } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Coins01Icon, ArrowLeft01Icon, ArrowRight01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const AGENT_AVATAR = '/logo.webp';

const ITEMS_PER_PAGE = 9;

const SORT_OPTIONS: SortOption[] = [
  { value: 'apy-high', label: 'APY (High)' },
  { value: 'apy-low', label: 'APY (Low)' },
  { value: 'tvl-high', label: 'TVL (High)' },
  { value: 'tvl-low', label: 'TVL (Low)' },
];

const FILTER_CONFIG: FilterConfig[] = [
  {
    key: 'risk',
    label: 'Risk Level',
    options: [
      { value: 'all', label: 'All' },
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'degen', label: 'Degen' },
    ],
  },
  {
    key: 'chain',
    label: 'Chain',
    options: [
      { value: 'all', label: 'All Chains' },
      { value: 'ethereum', label: 'Ethereum' },
      { value: 'arbitrum', label: 'Arbitrum' },
      { value: 'base', label: 'Base' },
      { value: 'optimism', label: 'Optimism' },
      { value: 'polygon', label: 'Polygon' },
    ],
  },
];

export function YieldFarming() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('apy-high');
  const [filters, setFilters] = useState<Record<string, string>>({
    risk: 'all',
    chain: 'all',
  });

  const { data: yieldData, isLoading, isError } = useAllYield();
  const allOpportunities = yieldData?.opportunities || [];
  const { tier, isConnected, isLoading: isTierLoading } = useUserTier();
  const { connect, connectors } = useConnect();

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

  // Filter, sort, and paginate logic
  const { featuredOpportunity, paginatedOpportunities, totalPages, totalFiltered } = useMemo(() => {
    // First one is always featured
    const featured = allOpportunities[0] || null;
    const latestId = featured?.pool_id;
    let list = allOpportunities.filter((o: YieldOpportunity) => o.pool_id !== latestId);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((opp: YieldOpportunity) => {
        const protocol = opp.protocol?.toLowerCase() || '';
        const chain = opp.chain?.toLowerCase() || '';
        const symbol = opp.symbol?.toLowerCase() || '';
        const analysis = opp.analysis?.toLowerCase() || '';
        return protocol.includes(query) || chain.includes(query) || symbol.includes(query) || analysis.includes(query);
      });
    }

    // Risk filter
    if (filters.risk !== 'all') {
      list = list.filter((opp: YieldOpportunity) => {
        return opp.risk_level?.toLowerCase() === filters.risk;
      });
    }

    // Chain filter
    if (filters.chain !== 'all') {
      list = list.filter((opp: YieldOpportunity) => {
        return opp.chain?.toLowerCase() === filters.chain;
      });
    }

    // Sort
    list = [...list].sort((a: YieldOpportunity, b: YieldOpportunity) => {
      switch (sortBy) {
        case 'apy-low':
          return (a.apy || 0) - (b.apy || 0);
        case 'tvl-high':
          return (b.tvl || 0) - (a.tvl || 0);
        case 'tvl-low':
          return (a.tvl || 0) - (b.tvl || 0);
        case 'apy-high':
        default:
          return (b.apy || 0) - (a.apy || 0);
      }
    });

    const totalFiltered = list.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const paginatedOpportunities = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { featuredOpportunity: featured, paginatedOpportunities, totalPages, totalFiltered };
  }, [allOpportunities, searchQuery, sortBy, filters, page]);

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
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

      {/* First Opportunity - Always visible */}
      {featuredOpportunity && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Featured Opportunity</h3>
          <YieldCard opportunity={featuredOpportunity} index={0} />
        </div>
      )}

      {/* Remaining Opportunities - Gated for Silver+ */}
      {allOpportunities && allOpportunities.length > 1 && (
        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.SILVER}
          onConnect={!isConnected ? handleConnect : undefined}
          isLoading={isTierLoading}
        >
          <div className="space-y-4 pt-8 border-t border-gray-800">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">More Opportunities</h3>
              
              <SearchAndSort
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search protocols, chains, tokens..."
                sortOptions={SORT_OPTIONS}
                currentSort={sortBy}
                onSortChange={setSortBy}
                filters={FILTER_CONFIG}
                activeFilters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>

            {paginatedOpportunities.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedOpportunities.map((opp: YieldOpportunity, index: number) => (
                    <YieldCard key={opp.pool_id || index + 1} opportunity={opp} index={index + 1} />
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
                  <HugeiconsIcon icon={Coins01Icon} className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Matching Opportunities</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>
        </GatedContent>
      )}

      {/* No Opportunities Fallback - Auto scan triggered by backend */}
      {allOpportunities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8 bg-gray-900/50 border border-gray-800 rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Scanning for Yield Opportunities</h3>
          <p className="text-gray-400 text-center max-w-md">
            The AI is actively scanning DeFi protocols for high-quality opportunities. 
            This page will update automatically once data is available.
          </p>
        </div>
      )}
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

  const date = new Date(opportunity.created_at).toLocaleDateString(undefined, { 
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
      className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/30 transition-colors group flex flex-col"
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

      <p className="text-sm text-gray-400 mb-4 line-clamp-3 flex-grow">
        {opportunity.analysis}
      </p>

      {opportunity.url && (
        <a
          href={opportunity.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-400 transition-colors mb-4"
        >
          View Pool <ExternalLink className="w-3 h-3" />
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
