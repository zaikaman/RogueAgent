import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnect } from 'wagmi';
import { useAllIntelHistory, useIntelDetail, IntelItem } from '../hooks/useIntel';
import { useUserTier } from '../hooks/useUserTier';
import { IntelBlog } from '../components/IntelBlog';
import { IntelCard } from '../components/IntelCard';
import { GatedContent } from '../components/GatedContent';
import { SearchAndSort, SortOption, FilterConfig } from '../components/ui/SearchAndSort';
import { TIERS } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { News01Icon, ArrowLeft01Icon, ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { Button } from '../components/ui/button';

const ITEMS_PER_PAGE = 9;

const SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const FILTER_CONFIG: FilterConfig[] = [
  {
    key: 'type',
    label: 'Report Type',
    options: [
      { value: 'all', label: 'All' },
      { value: 'deep_dive', label: 'Deep Dive' },
      { value: 'alpha_report', label: 'Alpha Report' },
    ],
  },
];

export function IntelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState<Record<string, string>>({
    type: 'all',
  });

  const { data: historyData, isLoading: isHistoryLoading } = useAllIntelHistory();
  const { data: detailData, isLoading: isDetailLoading } = useIntelDetail(id);
  const { tier, isConnected, isLoading: isTierLoading } = useUserTier();
  const { connect, connectors } = useConnect();

  // Reset page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy, filters]);

  const isLoading = id ? isDetailLoading : isHistoryLoading;

  const handleConnect = () => {
    const connector = connectors[0];
    connect({ connector });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const intelItems = historyData?.data || [];
  
  // latestIntel: the first item is the Latest Report
  const latestIntel = intelItems.length > 0 ? intelItems[0] : null;

  // Filter, sort, and paginate archive
  const { paginatedArchive, totalPages, totalFiltered } = useMemo(() => {
    const latestId = latestIntel?.id;
    let list = intelItems.filter((it: IntelItem) => it.id !== latestId);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((item: IntelItem) => {
        const topic = item.content?.topic?.toLowerCase() || '';
        const headline = item.content?.headline?.toLowerCase() || '';
        const tweet = item.content?.tweet_text?.toLowerCase() || '';
        const blog = item.content?.blog_post?.toLowerCase() || '';
        return topic.includes(query) || headline.includes(query) || tweet.includes(query) || blog.includes(query);
      });
    }

    // Type filter
    if (filters.type !== 'all') {
      list = list.filter((item: IntelItem) => {
        if (filters.type === 'deep_dive') return item.type === 'deep_dive';
        if (filters.type === 'alpha_report') return item.type !== 'deep_dive';
        return true;
      });
    }

    // Sort
    list = [...list].sort((a: IntelItem, b: IntelItem) => {
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const totalFiltered = list.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const paginatedArchive = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedArchive, totalPages, totalFiltered };
  }, [intelItems, latestIntel, searchQuery, sortBy, filters, page]);

  const selectedIntel = id ? detailData : null;

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
  };

  if (id && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HugeiconsIcon icon={Loading03Icon} className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (selectedIntel) {
    const content = selectedIntel.content;
    const articleContent = content.long_form_content || content.blog_post || content.formatted_thread || content.tweet_text || '';
    const headline = content.headline || content.topic;
    
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          className="gap-2 pl-0 hover:pl-2 transition-all text-gray-400 hover:text-white"
          onClick={() => navigate('/app/intel')}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
          Back to Feed
        </Button>
        
        <IntelBlog 
          title={headline}
          content={articleContent} 
          date={new Date(selectedIntel.created_at).toLocaleDateString()} 
          imageUrl={content.image_url}
          tldr={content.tldr}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={News01Icon} className="w-6 h-6 text-cyan-500" />
            Intel Feed
          </h2>
          <p className="text-gray-400 mt-1">Deep dive analysis and raw intelligence streams.</p>
        </div>
        {isLoading && (
          <HugeiconsIcon icon={Loading03Icon} className="w-5 h-5 text-cyan-500 animate-spin" />
        )}
      </div>

      {/* Latest Intel - Always Visible */}
      {latestIntel && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Latest Report</h3>
          <IntelCard intel={latestIntel} onClick={() => navigate(`/app/intel/${latestIntel.id}`)} />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Archive</h3>
          
          <SearchAndSort
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search reports..."
            sortOptions={SORT_OPTIONS}
            currentSort={sortBy}
            onSortChange={setSortBy}
            filters={FILTER_CONFIG}
            activeFilters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.SILVER}
          onConnect={!isConnected ? handleConnect : undefined}
          isLoading={isTierLoading}
        >
          {paginatedArchive.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedArchive.map((intel: IntelItem) => (
                  <IntelCard 
                    key={intel.id} 
                    intel={intel} 
                    onClick={() => navigate(`/app/intel/${intel.id}`)} 
                  />
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
                    <span className="text-gray-600 ml-2">({totalFiltered} results)</span>
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
            !isLoading && (
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={News01Icon} className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {searchQuery || filters.type !== 'all' ? 'No Matching Reports' : 'No Archived Reports'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchQuery || filters.type !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Older intelligence reports will appear here.'}
                </p>
              </div>
            )
          )}
        </GatedContent>
      </div>
    </div>
  );
}
