import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

interface DocsLayoutProps {
  children: React.ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    {
      title: 'Getting Started',
      links: [
        { title: 'Introduction', href: '/docs' },
        { title: 'Quickstart', href: '/docs/quickstart' },
        { title: 'Architecture', href: '/docs/architecture' },
      ]
    },
    {
      title: 'Core Concepts',
      links: [
        { title: 'Agents Reference', href: '/docs/agents' },
        { title: 'Configuration', href: '/docs/configuration' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-noir-black text-gray-300 font-sans selection:bg-teal-glow/30 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-noir-black/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/logo.webp" alt="Rogue Logo" className="w-8 h-8 rounded-full" />
              <span className="text-white text-lg font-bold tracking-tight">ROGUE <span className="text-teal-glow font-normal text-sm ml-1">DOCS</span></span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1 text-sm font-medium text-white/60">
               <Link to="/docs" className={`px-3 py-1.5 rounded-md transition-colors ${location.pathname.startsWith('/docs') ? 'text-white bg-white/5' : 'hover:text-white hover:bg-white/5'}`}>
                 Documentation
               </Link>
               <a href="https://github.com/zaikaman/RogueAgent" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-md hover:text-white hover:bg-white/5 transition-colors">
                 GitHub
               </a>
               <Link to="/app" className="px-3 py-1.5 rounded-md hover:text-white hover:bg-white/5 transition-colors">
                 App
               </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400 hover:text-white">
                {isMobileMenuOpen ? <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" /> : <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16 max-w-[1600px] mx-auto flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-noir-black border-r border-white/5 pt-20 pb-10 px-6 overflow-y-auto transition-transform duration-300 md:translate-x-0 md:static md:h-[calc(100vh-4rem)] md:pt-8 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="space-y-8">
            {navigation.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">{section.title}</h3>
                <ul className="space-y-1">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <Link 
                        to={link.href} 
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === link.href ? 'bg-teal-glow/10 text-teal-glow font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 py-10 px-6 md:px-12 lg:px-16">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
          
          {/* Footer for docs */}
          <div className="max-w-5xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>&copy; 2025 Rogue Agent. All rights reserved.</p>
            <div className="flex gap-6">
                <a href="https://github.com/zaikaman/RogueAgent" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
                <a href="https://t.me/rogueadkbot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram</a>
                <a href="https://x.com/RogueADK" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
