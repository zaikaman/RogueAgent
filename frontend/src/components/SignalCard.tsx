import { ArrowUpRight, Activity, Target, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface SignalCardProps {
  signal: any;
  isLoading?: boolean;
}

export function SignalCard({ signal, isLoading }: SignalCardProps) {
  if (isLoading) {
    return <div className="h-64 bg-gray-900/50 animate-pulse rounded-xl border border-gray-800" />;
  }

  if (!signal) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Activity className="w-12 h-12 mb-4 opacity-20" />
          <p>No active signal</p>
        </CardContent>
      </Card>
    );
  }

  const { token, confidence, analysis, entry_price, target_price, stop_loss, status, pnl_percent, current_price } = signal.content;

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">ACTIVE</Badge>;
      case 'tp_hit':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">TP HIT</Badge>;
      case 'sl_hit':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">SL HIT</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">CLOSED</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-pulse">LIMIT ORDER</Badge>;
    }
  };

  const pnlColor = (pnl_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <Card className="bg-gray-900/50 border-gray-800 overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-600" />
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Latest Signal</div>
              {getStatusBadge()}
            </div>
            <CardTitle className="text-3xl font-bold text-white flex items-center gap-2">
              {token?.symbol || 'UNKNOWN'}
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/30">
                {confidence}/10
              </Badge>
            </CardTitle>
            <div className="text-sm text-gray-400 mt-1">{token?.name}</div>
          </div>
          <div className="text-right">
             {current_price && (
                <div className="text-2xl font-mono font-bold text-white">
                  ${current_price < 1 ? current_price.toFixed(6) : current_price.toFixed(2)}
                </div>
             )}
             {pnl_percent !== undefined && (
                <div className={`text-sm font-mono ${pnlColor}`}>
                  {pnl_percent > 0 ? '+' : ''}{pnl_percent.toFixed(2)}%
                </div>
             )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-gray-950/50 rounded-lg border border-gray-800/50">
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
              {analysis}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div className="flex flex-col p-2 bg-gray-800/30 rounded border border-gray-800/50">
                <span className="text-xs text-gray-500 uppercase flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Entry
                </span>
                <span className="font-mono text-sm text-gray-300">${entry_price}</span>
              </div>
              <div className="flex flex-col p-2 bg-gray-800/30 rounded border border-gray-800/50">
                <span className="text-xs text-gray-500 uppercase flex items-center gap-1">
                  <Target className="w-3 h-3 text-cyan-400" /> Target
                </span>
                <span className="font-mono text-sm text-cyan-300">${target_price}</span>
              </div>
              <div className="flex flex-col p-2 bg-gray-800/30 rounded border border-gray-800/50">
                <span className="text-xs text-gray-500 uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-400" /> Stop
                </span>
                <span className="font-mono text-sm text-red-300">${stop_loss}</span>
              </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
