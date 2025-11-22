import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Home01Icon, 
  ChartHistogramIcon, 
  News01Icon, 
  GpsSignal01Icon,
  Menu01Icon,
  Coins01Icon,
  Cancel01Icon,
  Rocket01Icon
} from '@hugeicons/core-free-icons';
import { Send, Terminal } from 'lucide-react';
import { WalletConnect } from '../WalletConnect';
import { Countdown } from '../Countdown';
import { ChainOfThoughtModal } from '../ChainOfThoughtModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStatus } from '../../hooks/useRunStatus';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const { data: runStatus } = useRunStatus();
  const lastRunTime = runStatus?.system_last_run_at || runStatus?.last_run?.created_at;
  
  // Refs for polling logic to access latest state without re-triggering effect
  const runStatusRef = useRef(runStatus);
  const isScanningRef = useRef(isScanning);

  useEffect(() => {
    runStatusRef.current = runStatus;
  }, [runStatus]);

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  useEffect(() => {
    // Poll for logs
    let timeoutId: NodeJS.Timeout;
    let lastId = 0;
    let wasScanning = false;

    const pollLogs = async () => {
      let nextPollDelay = 30000; // Default deep idle poll: 30s

      // Check if we should be in "Anticipation Mode" (close to scheduled run)
      if (runStatusRef.current?.system_last_run_at && runStatusRef.current?.interval_minutes) {
          const lastRun = new Date(runStatusRef.current.system_last_run_at).getTime();
          const nextRun = lastRun + (runStatusRef.current.interval_minutes * 60 * 1000);
          const diff = nextRun - Date.now();
          
          // If within 5 minutes of next run, poll faster (5s)
          if (diff < 5 * 60 * 1000 && diff > -5 * 60 * 1000) {
              nextPollDelay = 5000;
          }
      }

      // If we are actively scanning, poll very fast (2s)
      if (wasScanning || isScanningRef.current) {
          nextPollDelay = 2000;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/run/logs?after=${lastId}`);
        if (response.ok) {
          const newLogs = await response.json();
          
          if (newLogs && newLogs.length > 0) {
            // Update id to last log
            lastId = newLogs[newLogs.length - 1].id;

            // Update logs state
            setLogs(prev => {
              const existingIds = new Set(prev.map(l => l.id));
              const uniqueNewLogs = newLogs.filter((l: any) => !existingIds.has(l.id));
              return [...prev, ...uniqueNewLogs];
            });
            
            // Determine Run State
            const startLogs = newLogs.filter((l: any) => l.message && (l.message.includes('Starting') || l.message.includes('Initializing')));
            const endLogs = newLogs.filter((l: any) => l.message && (l.message.includes('Run completed successfully') || l.message.includes('Swarm run failed')));
            
            const lastStart = startLogs.length > 0 ? startLogs[startLogs.length - 1] : null;
            const lastEnd = endLogs.length > 0 ? endLogs[endLogs.length - 1] : null;
            
            const lastStartId = lastStart ? lastStart.id : -1;
            const lastEndId = lastEnd ? lastEnd.id : -1;
            
            // Check if run is active (Start is more recent than End)
            const isRunActive = lastStartId > lastEndId;
            
            // Check recency (if logs are older than 1 minute, assume inactive)
            const lastLog = newLogs[newLogs.length - 1];
            const isRecent = (Date.now() - lastLog.timestamp) < 60000;

            if (isRunActive) {
               // Run is definitely active
               setIsScanning(true);
               wasScanning = true;
               nextPollDelay = 2000; // Active poll: 2s
               
               // Auto-open if we just detected the start OR if we just loaded the page and it's active
               if (lastStart || (!wasScanning && isRecent)) {
                   setIsModalOpen(true);
               }
            } else {
               // Run is finished OR ambiguous
               if (lastEndId > lastStartId) {
                   // Definitely finished
                   setIsScanning(false);
                   wasScanning = false;
                   // Delay will be reset to idle/anticipation on next loop
               } else {
                   // Ambiguous case
                   if (wasScanning) {
                       setIsScanning(true);
                       nextPollDelay = 2000; // Keep polling fast if we think we are scanning
                   } else {
                       if (isRecent) {
                           setIsScanning(true);
                           setIsModalOpen(true);
                           wasScanning = true;
                           nextPollDelay = 2000;
                       } else {
                           setIsScanning(false);
                       }
                   }
               }
            }
          } else {
             // No new logs
             if (wasScanning) {
                 nextPollDelay = 2000; // Keep checking fast if we think we are running
             }
          }
        }
      } catch (error) {
        console.error('Failed to poll logs:', error);
      }
      
      // Schedule next poll
      timeoutId = setTimeout(pollLogs, nextPollDelay);
    };

    // Initial poll
    pollLogs();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const navItems = [
    { icon: Home01Icon, label: 'Dashboard', path: '/app' },
    { icon: GpsSignal01Icon, label: 'Signals', path: '/app/signals' },
    { icon: News01Icon, label: 'Intel', path: '/app/intel' },
    { icon: Coins01Icon, label: 'Yield', path: '/app/yield' },
    { icon: Rocket01Icon, label: 'Airdrops', path: '/app/airdrops' },
    { icon: ChartHistogramIcon, label: 'Analytics', path: '/app/analytics' },
    // { icon: Settings01Icon, label: 'Settings', path: '/app/settings' },
  ];

  return (
    <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-cyan-500/30 flex">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
        <aside className={`
          w-64 border-r border-gray-800 bg-gray-950/95 backdrop-blur flex flex-col fixed h-full z-50 transition-transform duration-300 ease-in-out
          md:translate-x-0 md:z-40
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-3 no-underline" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="p-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20 flex items-center justify-center">
              <img src="/logo.webp" alt="Rogue" className="h-6 w-6 object-contain rounded" />
            </div>
            <span className="font-bold text-white tracking-tight">ROGUE</span>
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
              >
                <HugeiconsIcon icon={item.icon} className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-white'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Only Actions */}
        <div className="md:hidden p-4 border-t border-gray-800 space-y-4 bg-gray-900/30">
            <div className="flex justify-center w-full">
                <Countdown 
                  lastRunTime={lastRunTime} 
                  intervalMinutes={runStatus?.interval_minutes}
                />
            </div>
            <a 
              href="https://t.me/rogueadkbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#2AABEE]/10 border border-[#2AABEE]/20 text-[#2AABEE] hover:bg-[#2AABEE]/20 transition-colors group w-full"
            >
               <Send className="w-4 h-4" />
               <span className="text-sm font-medium">Telegram Bot</span>
            </a>
            <div className="flex justify-center w-full">
                <WalletConnect />
            </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-600 font-mono text-center">
            v1.0.0-alpha
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-800 bg-gray-950/50 backdrop-blur sticky top-0 z-30 px-6 flex items-center justify-between">
           <div className="md:hidden flex items-center gap-3">
             {/* Mobile Menu Trigger */}
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-400 hover:text-white">
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" />
             </button>
             <Link to="/" className="font-bold text-white no-underline">ROGUE</Link>
           </div>
          
          <div className="hidden md:block">
             {/* Breadcrumbs or Page Title could go here */}
          </div>

          <div className="hidden md:flex items-center gap-4 ml-auto">
            <a 
              href="https://t.me/rogueadkbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2AABEE]/10 border border-[#2AABEE]/20 text-[#2AABEE] hover:bg-[#2AABEE]/20 transition-colors group"
            >
               <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
               <span className="text-sm font-medium hidden sm:inline">Telegram Bot</span>
            </a>
            <Countdown 
              lastRunTime={lastRunTime} 
              intervalMinutes={runStatus?.interval_minutes}
            />
            <div className="h-6 w-px bg-gray-800" />
            <WalletConnect />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Chain of Thought Modal */}
      <ChainOfThoughtModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        logs={logs} 
      />

      {/* Reopen Button */}
      <AnimatePresence>
        {isScanning && !isModalOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-8 right-8 z-50 bg-black border border-cyan-500/50 text-cyan-500 px-4 py-2 rounded-full font-mono text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:bg-cyan-900/20 transition-colors"
          >
            <Terminal className="w-4 h-4 animate-pulse" />
            SYSTEM_CORE_ACTIVE
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
