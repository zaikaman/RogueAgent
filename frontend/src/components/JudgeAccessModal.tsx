import { Dialog, DialogContent } from './ui/dialog';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon, SecurityCheckIcon } from '@hugeicons/core-free-icons';

interface JudgeAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (isJudge: boolean) => void;
}

export function JudgeAccessModal({ isOpen, onClose, onConfirm }: JudgeAccessModalProps) {
  const handleYes = () => {
    onConfirm(true);
    onClose();
  };

  const handleNo = () => {
    onConfirm(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border border-cyan-500/30 text-cyan-500 font-mono sm:max-w-[500px] p-0 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)]">
        {/* Header Bar */}
        <div className="bg-cyan-950/20 border-b border-cyan-500/30 p-3 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
             <span className="text-xs uppercase tracking-widest text-cyan-400/80">System Override // IQAI Protocol</span>
           </div>
           <div className="text-[10px] text-cyan-500/40">V.2.0.4</div>
        </div>

        <div className="p-8 space-y-8">
            {/* Icon & Title */}
            <div className="flex flex-col items-center text-center space-y-5">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                    >
                      <HugeiconsIcon icon={SecurityCheckIcon} className="w-16 h-16 text-cyan-400 relative z-10" />
                    </motion.div>
                </div>
                
                <div>
                    <h2 className="text-xl font-bold tracking-[0.2em] text-white uppercase mb-1">Identity Verification</h2>
                    <p className="text-cyan-500/60 text-xs uppercase tracking-widest">Clearance Level Request</p>
                </div>
            </div>

            {/* Message Box */}
            <div className="bg-cyan-950/10 border border-cyan-500/20 p-5 relative group">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/50 group-hover:border-cyan-400 transition-colors" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/50 group-hover:border-cyan-400 transition-colors" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500/50 group-hover:border-cyan-400 transition-colors" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/50 group-hover:border-cyan-400 transition-colors" />
                
                <p className="text-sm leading-relaxed text-gray-400 font-light">
                  <span className="text-cyan-400 font-bold mr-2">&gt;&gt; DETECTED:</span>
                  Potential IQAI Judge signature found in active session.
                  <br /><br />
                  Confirm identity to bypass standard security protocols and receive temporary <span className="text-white font-bold bg-cyan-500/10 px-1">DIAMOND TIER</span> clearance for 24 hours.
                </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleNo} 
                  className="border border-gray-800 hover:border-gray-600 text-gray-600 hover:text-gray-400 py-3 px-4 text-[10px] uppercase tracking-[0.2em] transition-all duration-300"
                >
                    [ Decline ]
                </button>
                <button 
                  onClick={handleYes} 
                  className="relative overflow-hidden bg-cyan-500/5 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black text-cyan-400 py-3 px-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 group"
                >
                    <span className="relative z-10 flex items-center gap-2">
                      <HugeiconsIcon icon={Crown02Icon} className="w-4 h-4" />
                      Confirm Identity
                    </span>
                </button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
