import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useConnect } from 'wagmi';
import { useAllAirdrops, Airdrop } from '../hooks/useAirdrops';
import { useUserTier } from '../hooks/useUserTier';
import { GatedContent } from '../components/GatedContent';
import { SearchAndSort, SortOption, FilterConfig } from '../components/ui/SearchAndSort';
import { TIERS } from '../constants/tiers';
import { Loader2, ExternalLink, Send } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, ArrowLeft01Icon, ArrowRight01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const AGENT_AVATAR = '/logo.webp';

const ITEMS_PER_PAGE = 9;

const SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'score-high', label: 'Score (High)' },
  { value: 'score-low', label: 'Score (Low)' },
];

const FILTER_CONFIG: FilterConfig[] = [
  {
    key: 'chain',
    label: 'Chain',
    options: [
      { value: 'all', label: 'All Chains' },
      { value: 'ethereum', label: 'Ethereum' },
      { value: 'solana', label: 'Solana' },
      { value: 'base', label: 'Base' },
      { value: 'arbitrum', label: 'Arbitrum' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    options: [
      { value: 'all', label: 'All Types' },
      { value: 'points', label: 'Points' },
      { value: 'testnet', label: 'Testnet' },
      { value: 'mainnet', label: 'Mainnet' },
    ],
  },
];

export function AirdropsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState<Record<string, string>>({
    chain: 'all',
    type: 'all',
  });

  const { data: airdropData, isLoading, isError } = useAllAirdrops();
  const allAirdrops = airdropData?.airdrops || [];
  const { tier, isConnected } = useUserTier();
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
  const { featuredAirdrop, paginatedAirdrops, totalPages, totalFiltered } = useMemo(() => {
    // First one is always featured
    const featured = allAirdrops[0] || null;
    const latestId = featured?.id;
    let list = allAirdrops.filter((o: Airdrop) => o.id !== latestId);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((drop: Airdrop) => {
        const ticker = drop.ticker?.toLowerCase() || '';
        const chain = drop.chain?.toLowerCase() || '';
        const why = drop.why_promising?.toLowerCase() || '';
        const tasks = drop.tasks?.toLowerCase() || '';
        return ticker.includes(query) || chain.includes(query) || why.includes(query) || tasks.includes(query);
      });
    }

    // Chain filter
    if (filters.chain !== 'all') {
      list = list.filter((drop: Airdrop) => {
        const chain = drop.chain?.toLowerCase() || '';
        if (filters.chain === 'other') {
          return !['ethereum', 'solana', 'base', 'arbitrum'].includes(chain);
        }
        return chain === filters.chain;
      });
    }

    // Type filter
    if (filters.type !== 'all') {
      list = list.filter((drop: Airdrop) => {
        const type = drop.type?.toLowerCase() || '';
        return type.includes(filters.type);
      });
    }

    // Sort
    list = [...list].sort((a: Airdrop, b: Airdrop) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'score-high':
          return (b.rogue_score || 0) - (a.rogue_score || 0);
        case 'score-low':
          return (a.rogue_score || 0) - (b.rogue_score || 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    const totalFiltered = list.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const paginatedAirdrops = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { featuredAirdrop: featured, paginatedAirdrops, totalPages, totalFiltered };
  }, [allAirdrops, searchQuery, sortBy, filters, page]);

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
        Failed to load airdrop opportunities.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={Rocket01Icon} className="w-6 h-6 text-cyan-500" />
            Airdrop Oracle
          </h2>
          <p className="text-gray-400 mt-1">High-conviction airdrop & points farming opportunities.</p>
        </div>
      </div>

      {/* First Opportunity - Visible only on page 1 */}
      {page === 1 && featuredAirdrop && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Featured Airdrop</h3>
          <AirdropCard airdrop={featuredAirdrop} index={0} featured />
        </div>
      )}

      {/* Remaining Opportunities - Gated for Silver+ */}
      {allAirdrops && allAirdrops.length > 1 && (
        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.SILVER}
          onConnect={!isConnected ? handleConnect : undefined}
        >
          <div className="space-y-4 pt-8 border-t border-gray-800">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">More Opportunities</h3>
              
              <SearchAndSort
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search airdrops..."
                sortOptions={SORT_OPTIONS}
                currentSort={sortBy}
                onSortChange={setSortBy}
                filters={FILTER_CONFIG}
                activeFilters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>

            {paginatedAirdrops.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedAirdrops.map((drop: Airdrop, index: number) => (
                    <AirdropCard key={drop.id || index + 1} airdrop={drop} index={index + 1} />
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
                  <HugeiconsIcon icon={Rocket01Icon} className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Matching Airdrops</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>
        </GatedContent>
      )}
    </div>
  );
}

function AirdropCard({ airdrop, index, featured = false }: { airdrop: Airdrop; index: number; featured?: boolean }) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 border-green-400/20 bg-green-400/10';
    if (score >= 80) return 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10';
    if (score >= 70) return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
    return 'text-orange-400 border-orange-400/20 bg-orange-400/10';
  };

  const scoreColor = getScoreColor(airdrop.rogue_score);

  const date = new Date(airdrop.created_at).toLocaleDateString(undefined, { 
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
          <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
            {airdrop.ticker}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
            <span className="uppercase px-2 py-0.5 rounded bg-gray-800 text-xs font-medium text-gray-300 border border-gray-700/50">
              {airdrop.chain}
            </span>
            <span className="text-xs bg-gray-800/50 px-2 py-0.5 rounded text-gray-400 border border-gray-800">{airdrop.type}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
            <div className={`px-2 py-1 rounded text-xs font-bold border ${scoreColor}`}>
            Score: {airdrop.rogue_score}
            </div>
            <div className="text-xs text-gray-500 font-medium">{airdrop.est_value_usd}</div>
        </div>
      </div>

      <div className="mb-4 flex-grow">
        <p className="text-sm text-gray-300 mb-3 font-medium leading-relaxed">
            {airdrop.why_promising}
        </p>
        <div className="bg-black/40 border border-gray-800/60 p-3 rounded-lg text-xs text-gray-400">
            <div className="font-bold text-gray-500 mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-cyan-500"></span>
              Tasks
            </div>
            <div className="leading-relaxed text-gray-300">
              {airdrop.tasks}
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
        <div className="text-xs font-medium text-gray-500 bg-gray-800/30 px-2 py-1 rounded">
            {airdrop.deadline_or_phase}
        </div>
        <div className="flex gap-3">
            {airdrop.link_tg && (
                <a href={airdrop.link_tg} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#2AABEE] transition-colors">
                    <Send className="w-4 h-4" />
                </a>
            )}
            {airdrop.link_x && (
                <a href={airdrop.link_x} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
            )}
            {airdrop.link_dashboard && (
                <a
                href={airdrop.link_dashboard}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-sm font-bold transition-colors ${
                  airdrop.rogue_score >= 90 ? 'text-green-400 hover:text-green-300' : 
                  airdrop.rogue_score >= 80 ? 'text-cyan-400 hover:text-cyan-300' : 
                  'text-cyan-500 hover:text-cyan-400'
                }`}
                >
                Farm <ExternalLink className="w-3 h-3" />
                </a>
            )}
        </div>
      </div>

      {/* Timestamp Footer */}
      <div className="flex items-center pt-3 border-t border-gray-800 mt-4">
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
