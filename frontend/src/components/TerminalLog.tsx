import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Terminal, CheckCircle2, AlertCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  type: 'signal' | 'intel' | 'skip';
  created_at: string;
  content: any;
  confidence_score?: number;
}

interface TerminalLogProps {
  logs: LogEntry[];
}

export function TerminalLog({ logs }: TerminalLogProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'signal': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'intel': return <Terminal className="w-4 h-4 text-blue-500" />;
      case 'skip': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Terminal className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-black border border-gray-800 rounded-lg font-mono text-sm">
      <div className="p-2 border-b border-gray-800 bg-gray-900/50 text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
        <Terminal className="w-3 h-3" />
        System Logs
      </div>
      <ScrollArea className="h-[300px]">
        <div className="p-2 space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-gray-900/50 rounded transition-colors group">
              <div className="mt-0.5 opacity-70">{getIcon(log.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-500 text-xs">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-gray-700 text-gray-400 uppercase">
                    {log.type}
                  </Badge>
                  {log.confidence_score && (
                    <span className="text-xs text-cyan-500">
                      Score: {log.confidence_score}/10
                    </span>
                  )}
                </div>
                <div className="text-gray-300 truncate font-mono text-xs">
                  {log.content?.log_message || (log.type === 'signal' 
                    ? `SIGNAL DETECTED: ${log.content.token?.symbol} - ${log.content.token?.name}`
                    : log.type === 'skip'
                    ? 'Scan completed. No high-confidence signals found.'
                    : 'Intel thread generated.')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
