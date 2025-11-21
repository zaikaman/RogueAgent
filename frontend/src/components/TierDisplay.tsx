import { Shield, Star, Zap, Lock } from 'lucide-react';
import { TIERS, TIER_BENEFITS, Tier } from '../constants/tiers';

interface TierDisplayProps {
  tier: Tier;
  balance: number;
}

export function TierDisplay({ tier, balance }: TierDisplayProps) {
  const getTierColor = (t: Tier) => {
    switch (t) {
      case TIERS.DIAMOND: return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/30';
      case TIERS.GOLD: return 'text-yellow-400 border-yellow-500/50 bg-yellow-950/30';
      case TIERS.SILVER: return 'text-slate-300 border-slate-400/50 bg-slate-800/30';
      default: return 'text-gray-500 border-gray-700 bg-gray-900/30';
    }
  };

  const getTierIcon = (t: Tier) => {
    switch (t) {
      case TIERS.DIAMOND: return <Zap className="w-5 h-5" />;
      case TIERS.GOLD: return <Star className="w-5 h-5" />;
      case TIERS.SILVER: return <Shield className="w-5 h-5" />;
      default: return <Lock className="w-5 h-5" />;
    }
  };

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-lg border ${getTierColor(tier)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          {getTierIcon(tier)}
          <span>{tier} TIER</span>
        </div>
        <div className="text-sm font-mono opacity-80">
          {balance.toFixed(2)} RGE
        </div>
      </div>
      
      <div className="mt-2 space-y-1">
        <div className="text-xs uppercase tracking-wider opacity-60">Benefits</div>
        <ul className="text-sm space-y-1">
          {TIER_BENEFITS[tier].map((benefit, i) => (
            <li key={i} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-current" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
