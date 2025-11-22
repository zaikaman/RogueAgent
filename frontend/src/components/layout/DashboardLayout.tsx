import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Home01Icon, 
  ChartHistogramIcon, 
  News01Icon, 
  GpsSignal01Icon,
  Menu01Icon,
  Coins01Icon
} from '@hugeicons/core-free-icons';
import { Send } from 'lucide-react';
import { WalletConnect } from '../WalletConnect';
import { Countdown } from '../Countdown';
import { useRunStatus } from '../../hooks/useRunStatus';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { data: runStatus } = useRunStatus();
  const lastRunTime = runStatus?.last_run?.created_at;
  const isDashboard = location.pathname === '/app';

  const navItems = [
    { icon: Home01Icon, label: 'Dashboard', path: '/app' },
    { icon: GpsSignal01Icon, label: 'Signals', path: '/app/signals' },
    { icon: News01Icon, label: 'Intel', path: '/app/intel' },
    { icon: Coins01Icon, label: 'Yield', path: '/app/yield' },
    { icon: ChartHistogramIcon, label: 'Analytics', path: '/app/analytics' },
    // { icon: Settings01Icon, label: 'Settings', path: '/app/settings' },
  ];

  return (
    <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-cyan-500/30 flex">
      {/* Sidebar */}
        <aside className="w-64 border-r border-gray-800 bg-gray-950/50 backdrop-blur hidden md:flex flex-col fixed h-full z-40">
        <Link to="/" className="h-16 flex items-center px-6 border-b border-gray-800 gap-3 no-underline">
          <div className="p-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20 flex items-center justify-center">
            <img src="/logo.webp" alt="Rogue" className="h-6 w-6 object-contain rounded" />
          </div>
          <span className="font-bold text-white tracking-tight">ROGUE</span>
        </Link>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
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
             {/* Mobile Menu Trigger - Placeholder */}
             <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6 text-gray-400" />
             <Link to="/" className="font-bold text-white no-underline">ROGUE</Link>
           </div>
          
          <div className="hidden md:block">
             {/* Breadcrumbs or Page Title could go here */}
          </div>

          <div className="flex items-center gap-4 ml-auto">
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

        <main className={`flex-1 p-6 ${isDashboard ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
