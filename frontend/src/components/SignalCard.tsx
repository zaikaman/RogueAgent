import { ArrowUpRight, Activity, BarChart3 } from 'lucide-react';
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

  const { token, confidence, reason, metrics } = signal.content;

  return (
    <Card className="bg-gray-900/50 border-gray-800 overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-600" />
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Latest Signal</div>
            <CardTitle className="text-3xl font-bold text-white flex items-center gap-2">
              {token.symbol}
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/30">
                {confidence}/10
              </Badge>
            </CardTitle>
            <div className="text-sm text-gray-400 mt-1">{token.name}</div>
          </div>
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <ArrowUpRight className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-gray-950/50 rounded-lg border border-gray-800/50">
            <p className="text-sm text-gray-300 leading-relaxed">
              {reason}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metrics && Object.entries(metrics).slice(0, 4).map(([key, value]: [string, any]) => (
              <div key={key} className="flex flex-col p-2 bg-gray-800/30 rounded border border-gray-800/50">
                <span className="text-xs text-gray-500 uppercase">{key.replace(/_/g, ' ')}</span>
                <span className="font-mono text-sm text-gray-300">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
