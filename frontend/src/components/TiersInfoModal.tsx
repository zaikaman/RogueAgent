import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { TIERS, TIER_BENEFITS, TIER_THRESHOLDS, Tier } from '../constants/tiers';
import { Shield, Star, Zap, Lock, Check } from 'lucide-react';

interface TiersInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TiersInfoModal({ isOpen, onClose }: TiersInfoModalProps) {
  const getTierIcon = (t: string) => {
    switch (t) {
      case TIERS.DIAMOND: return <Zap className="w-5 h-5 text-cyan-400" />;
      case TIERS.GOLD: return <Star className="w-5 h-5 text-yellow-400" />;
      case TIERS.SILVER: return <Shield className="w-5 h-5 text-slate-300" />;
      default: return <Lock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTierColor = (t: string) => {
    switch (t) {
      case TIERS.DIAMOND: return 'border-cyan-500/30 bg-cyan-950/20';
      case TIERS.GOLD: return 'border-yellow-500/30 bg-yellow-950/20';
      case TIERS.SILVER: return 'border-slate-400/30 bg-slate-800/20';
      default: return 'border-gray-700 bg-gray-900/20';
    }
  };

  const getThresholdText = (t: string) => {
    switch (t) {
      case TIERS.DIAMOND: return `${TIER_THRESHOLDS.DIAMOND.toLocaleString()} RGE`;
      case TIERS.GOLD: return `${TIER_THRESHOLDS.GOLD.toLocaleString()} RGE`;
      case TIERS.SILVER: return `${TIER_THRESHOLDS.SILVER.toLocaleString()} RGE`;
      default: return '0 RGE';
    }
  };

  const tiersOrder = [TIERS.NONE, TIERS.SILVER, TIERS.GOLD, TIERS.DIAMOND];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-gray-100 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">Tier Benefits & Requirements</DialogTitle>
          <DialogDescription className="text-center text-gray-400 mb-6">
            Hold $RGE tokens to unlock advanced features and faster signals.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiersOrder.map((tier) => (
            <div 
              key={tier} 
              className={`flex flex-col p-4 rounded-lg border ${getTierColor(tier)} relative overflow-hidden`}
            >
              <div className="flex items-center gap-2 mb-3">
                {getTierIcon(tier)}
                <span className="font-bold tracking-wider">{tier}</span>
              </div>
              
              <div className="mb-4 pb-4 border-b border-gray-800/50">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Requirement</div>
                <div className="font-mono text-lg font-semibold">{getThresholdText(tier)}</div>
              </div>

              <div className="flex-1">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Benefits</div>
                <ul className="space-y-2">
                  {TIER_BENEFITS[tier as Tier].map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
