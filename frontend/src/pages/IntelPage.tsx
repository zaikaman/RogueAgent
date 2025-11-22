import { useParams, useNavigate } from 'react-router-dom';
import { useConnect } from 'wagmi';
import { useIntelHistory } from '../hooks/useIntel';
import { useUserTier } from '../hooks/useUserTier';
import { IntelBlog } from '../components/IntelBlog';
import { IntelCard } from '../components/IntelCard';
import { GatedContent } from '../components/GatedContent';
import { TIERS } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { News01Icon, ArrowLeft01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { Button } from '../components/ui/button';

export function IntelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: historyData, isLoading } = useIntelHistory();
  const { tier, isConnected } = useUserTier();
  const { connect, connectors } = useConnect();

  const handleConnect = () => {
    const connector = connectors[0];
    connect({ connector });
  };

  const intelItems = historyData?.data || [];
  const selectedIntel = id ? intelItems.find(item => item.id === id) : null;

  if (id && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HugeiconsIcon icon={Loading03Icon} className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (selectedIntel) {
    const content = selectedIntel.content;
    const blogPost = content.blog_post || content.formatted_thread || content.tweet_text || '';
    
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
          title={content.topic}
          content={blogPost} 
          date={new Date(selectedIntel.created_at).toLocaleDateString()} 
          imageUrl={content.image_url}
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
      {intelItems.length > 0 && (
         <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Latest Report</h3>
            <IntelCard intel={intelItems[0]} onClick={() => navigate(`/app/intel/${intelItems[0].id}`)} />
         </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Archive</h3>
        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.SILVER}
          onConnect={!isConnected ? handleConnect : undefined}
        >
          {intelItems.length > 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {intelItems.slice(1).map((intel) => (
                <IntelCard 
                  key={intel.id} 
                  intel={intel} 
                  onClick={() => navigate(`/app/intel/${intel.id}`)} 
                />
              ))}
            </div>
          ) : (
            !isLoading && intelItems.length <= 1 && (
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
