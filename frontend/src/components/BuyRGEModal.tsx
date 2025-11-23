import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, AlertTriangle, Wallet } from 'lucide-react';

interface BuyRGEModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BuyRGEModal({ isOpen, onClose }: BuyRGEModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-black border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden font-mono"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-cyan-900/10 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-400">
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-bold tracking-wider">ACQUIRE $RGE // INSTRUCTIONS</span>
              </div>
              <button
                onClick={onClose}
                className="text-cyan-500/50 hover:text-cyan-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 bg-black/90 relative">
              {/* Scanlines effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
              
              <div className="relative z-20 space-y-6">
                
                <div className="flex items-start gap-3 p-4 rounded border border-yellow-900/50 bg-yellow-900/10 text-yellow-400">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="block mb-1 text-sm">RESTRICTED ACCESS</strong>
                    $RGE is currently in a pending state. Acquisition is only possible through the direct contract interaction link below.
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-cyan-500 text-xs uppercase tracking-widest font-bold">Direct Acquisition Link</h3>
                  <p className="text-gray-400 text-xs">
                    Use the official IQAI application interface to swap for $RGE.
                  </p>
                </div>

                <a 
                  href="https://app.iqai.com/pending/0xe5Ee677388a6393d135bEd00213E150b1F64b032"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full p-4 rounded bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all group"
                >
                  <span className="font-bold tracking-wide">INITIATE ACQUISITION</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                <div className="text-[10px] text-gray-600 text-center font-mono">
                  CONTRACT: 0xe5Ee677388a6393d135bEd00213E150b1F64b032
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
