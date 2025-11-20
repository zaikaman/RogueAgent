import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Tier, TIERS, TIER_THRESHOLDS } from '../constants/tiers';
import { Button } from './ui/button';

interface GatedContentProps {
  children: ReactNode;
  userTier: Tier;
  requiredTier: Tier;
  onConnect?: () => void;
}

export function GatedContent({ children, userTier, requiredTier, onConnect }: GatedContentProps) {
  const tierLevels = {
    [TIERS.NONE]: 0,
    [TIERS.SILVER]: 1,
    [TIERS.GOLD]: 2,
    [TIERS.DIAMOND]: 3,
  };

  const hasAccess = tierLevels[userTier] >= tierLevels[requiredTier];

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-950/50">
      <div className="absolute inset-0 backdrop-blur-sm bg-black/60 z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 bg-gray-800 rounded-full mb-4">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {requiredTier} Tier Required
        </h3>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">
          Hold ${requiredTier === TIERS.NONE ? 0 : TIER_THRESHOLDS[requiredTier as keyof typeof TIER_THRESHOLDS]} worth of $RGE to unlock this section.
        </p>
        {onConnect && (
          <Button onClick={onConnect} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-950">
            Connect Wallet
          </Button>
        )}
      </div>
      <div className="opacity-20 pointer-events-none filter blur-sm">
        {children}
      </div>
    </div>
  );
}
