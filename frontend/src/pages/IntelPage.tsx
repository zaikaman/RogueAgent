import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnect } from 'wagmi';
import { useIntelHistory, useIntelDetail } from '../hooks/useIntel';
import { useUserTier } from '../hooks/useUserTier';
import { IntelBlog } from '../components/IntelBlog';
import { IntelCard } from '../components/IntelCard';
import { GatedContent } from '../components/GatedContent';
import { TIERS } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { News01Icon, ArrowLeft01Icon, ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { Button } from '../components/ui/button';

export function IntelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data: historyData, isLoading: isHistoryLoading } = useIntelHistory(page, page === 1 ? 10 : 9);
  const { data: detailData, isLoading: isDetailLoading } = useIntelDetail(id);
  const { tier, isConnected, isLoading: isTierLoading } = useUserTier();
  const { connect, connectors } = useConnect();

  const isLoading = id ? isDetailLoading : isHistoryLoading;

  const handleConnect = () => {
    const connector = connectors[0];
    connect({ connector });
  };

  const intelItems = historyData?.data || [];
  const pagination = historyData?.pagination;
  const totalPages = pagination?.pages || 1;
  
  // latestIntel: on page 1 the backend is asked to include the latest report
  // as the first item. Use that as the Latest Report and remove it from
  // the archive rendering to avoid duplication.
  const latestIntel = page === 1 ? intelItems[0] : null;

  const filteredArchive = (() => {
    if (page === 1) {
      const latestId = latestIntel?.id;
      const list = intelItems.filter((it) => it.id !== latestId);
      return list.slice(0, 9); // ensure archive shows at most 9 so latest+archive = 10
    }
    return intelItems.slice(0, 9); // pages 2+ show 9 items
  })();

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

      {/* Latest Intel - Always Visible on Page 1 */}
      {page === 1 && latestIntel && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Latest Report</h3>
          <IntelCard intel={latestIntel} onClick={() => navigate(`/app/intel/${latestIntel.id}`)} />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Archive</h3>
        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.SILVER}
          onConnect={!isConnected ? handleConnect : undefined}
          isLoading={isTierLoading}
        >
          {filteredArchive.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArchive.map((intel) => (
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
                <h3 className="text-lg font-medium text-white mb-2">No Archived Reports</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Older intelligence reports will appear here.
                </p>
              </div>
            )
          )}
        </GatedContent>
      </div>
    </div>
  );
}
