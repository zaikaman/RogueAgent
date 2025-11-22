import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Cpu, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Log {
  id?: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  data?: any;
}

interface ChainOfThoughtModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: Log[];
}

export function ChainOfThoughtModal({ isOpen, onClose, logs }: ChainOfThoughtModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-black border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.1)] overflow-hidden font-mono"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-cyan-900/10 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-400">
                <Terminal className="w-4 h-4" />
                <span className="text-sm font-bold tracking-wider">ROGUE_AGENT // SYSTEM_CORE</span>
              </div>
              <button
                onClick={onClose}
                className="text-cyan-500/50 hover:text-cyan-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 h-[400px] bg-black/90 relative">
              {/* Scanlines effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
              
              <div 
                ref={scrollRef}
                className="h-full overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent"
              >
                {logs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-cyan-500/30 gap-2">
                    <Cpu className="w-8 h-8 animate-pulse" />
                    <span className="text-xs">AWAITING INPUT...</span>
                  </div>
                )}
                
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-3 text-xs p-2 rounded border ${
                      log.type === 'error' ? 'border-red-900/50 bg-red-900/10 text-red-400' :
                      log.type === 'success' ? 'border-cyan-900/50 bg-cyan-900/10 text-cyan-400' :
                      log.type === 'warning' ? 'border-yellow-900/50 bg-yellow-900/10 text-yellow-400' :
                      'border-transparent text-gray-400'
                    }`}
                  >
                    <span className="opacity-50 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}
                    </span>
                    <div className="mt-0.5 w-full">
                      <div>
                        {log.type === 'success' && <ShieldCheck className="w-3 h-3 inline mr-2" />}
                        {log.type === 'warning' && <AlertTriangle className="w-3 h-3 inline mr-2" />}
                        {log.type === 'info' && <Activity className="w-3 h-3 inline mr-2" />}
                        {log.message}
                      </div>
                      {log.data && (
                        <pre className="mt-2 p-2 bg-black/50 rounded border border-cyan-500/10 text-[10px] whitespace-pre-wrap break-words text-cyan-300/70 font-mono">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {/* Typing cursor */}
                <div className="h-4 w-2 bg-cyan-500/50 animate-pulse mt-2" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-cyan-900/5 border-t border-cyan-500/20 flex justify-between items-center text-[10px] text-cyan-500/40">
              <span>CPU: {Math.floor(Math.random() * 30 + 10)}%</span>
              <span>MEM: {Math.floor(Math.random() * 40 + 20)}%</span>
              <span className="animate-pulse">CONNECTED</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
