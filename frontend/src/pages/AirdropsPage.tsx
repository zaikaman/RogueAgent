import { motion } from 'framer-motion';
import { useState } from 'react';
import { useConnect } from 'wagmi';
import { useAirdrops, Airdrop } from '../hooks/useAirdrops';
import { useUserTier } from '../hooks/useUserTier';
import { GatedContent } from '../components/GatedContent';
import { TIERS } from '../constants/tiers';
import { Loader2, ExternalLink, Send } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

export function AirdropsPage() {
  const [page, setPage] = useState(1);
  const limit = page === 1 ? 10 : 9;
  const { data: airdropData, isLoading, isError } = useAirdrops(page, limit);
  const airdrops = airdropData?.airdrops || [];
  const pagination = airdropData?.pagination;
  const totalPages = pagination?.pages || 1;
  const { tier, isConnected } = useUserTier();
  const { connect, connectors } = useConnect();

  const handleConnect = () => {
    const connector = connectors[0];
    connect({ connector });
  };

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
      {page === 1 && airdrops && airdrops.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Featured Airdrop</h3>
          <AirdropCard airdrop={airdrops[0]} index={0} featured />
        </div>
      )}

      {/* Remaining Opportunities - Gated for Silver+ */}
      {airdrops && (page === 1 ? airdrops.length > 1 : airdrops.length > 0) && (
        <GatedContent 
          userTier={tier} 
          requiredTier={TIERS.SILVER}
          onConnect={!isConnected ? handleConnect : undefined}
        >
          <div className="space-y-4 pt-8 border-t border-gray-800">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">More Opportunities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                if (page === 1) {
                  const latestId = airdrops[0]?.id;
                  const list = airdrops.filter((o) => o.id !== latestId).slice(0, 9);
                  return list.map((drop, index) => (
                    <AirdropCard key={drop.id || index + 1} airdrop={drop} index={index + 1} />
                  ));
                }
                return airdrops.map((drop, index) => (
                  <AirdropCard key={drop.id || index + 1} airdrop={drop} index={index} />
                ));
              })()}
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
          </div>
        </GatedContent>
      )}
    </div>
  );
}

function AirdropCard({ airdrop, index, featured = false }: { airdrop: Airdrop; index: number; featured?: boolean }) {
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
            <span className="uppercase px-2 py-0.5 rounded bg-gray-800 text-xs font-medium">
              {airdrop.chain}
            </span>
            <span className="text-xs bg-gray-800/50 px-2 py-0.5 rounded">{airdrop.type}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
            <div className="px-2 py-1 rounded text-xs font-bold border text-cyan-400 border-cyan-400/20 bg-cyan-400/10">
            Score: {airdrop.rogue_score}
            </div>
            <div className="text-xs text-gray-500">{airdrop.est_value_usd}</div>
        </div>
      </div>

      <div className="mb-4 flex-grow">
        <p className="text-sm text-gray-300 mb-3 font-medium">
            {airdrop.why_promising}
        </p>
        <div className="bg-black/20 p-3 rounded-lg text-xs text-gray-400">
            <div className="font-semibold text-gray-500 mb-1 uppercase tracking-wider text-[10px]">Tasks</div>
            {airdrop.tasks}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800/50">
        <div className="text-xs text-gray-500">
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
                className="inline-flex items-center gap-1 text-sm text-cyan-500 hover:text-cyan-400 transition-colors font-medium"
                >
                Farm <ExternalLink className="w-3 h-3" />
                </a>
            )}
        </div>
      </div>
    </motion.div>
  );
}
