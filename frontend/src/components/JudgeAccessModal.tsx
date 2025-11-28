import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon, SparklesIcon } from '@hugeicons/core-free-icons';

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
      <DialogContent className="bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950/40 border-indigo-500/30 text-gray-100 sm:max-w-[480px] overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
          <motion.div 
            className="absolute top-4 right-4 text-yellow-400/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <HugeiconsIcon icon={SparklesIcon} className="w-24 h-24" />
          </motion.div>
        </div>
        
        <DialogHeader className="relative z-10">
          <motion.div 
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.5 }}
          >
            <HugeiconsIcon icon={Crown02Icon} className="w-8 h-8 text-white" />
          </motion.div>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
            Welcome to Rogue
          </DialogTitle>
          <DialogDescription className="text-center text-gray-300 text-base mt-2">
            Hey! Are you a judge from the <span className="text-indigo-400 font-semibold">IQAI team</span>?
          </DialogDescription>
        </DialogHeader>
        
        <motion.div 
          className="relative z-10 py-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center">
            <p className="text-gray-200 text-sm leading-relaxed">
              Confirm to get <span className="text-yellow-400 font-bold">full Diamond access</span> to Rogue for <span className="text-cyan-400 font-bold">24 hours</span>!
            </p>
            <p className="text-gray-500 text-xs mt-2">
              This includes all premium features, real-time signals, and advanced analytics.
            </p>
          </div>
        </motion.div>

        <DialogFooter className="relative z-10 flex gap-3 sm:gap-3">
          <Button 
            variant="outline" 
            onClick={handleNo} 
            className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200 hover:border-gray-600 transition-all duration-200"
          >
            No, thanks
          </Button>
          <Button 
            onClick={handleYes} 
            className="flex-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:via-amber-400 hover:to-orange-400 text-black font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/40"
          >
            <HugeiconsIcon icon={Crown02Icon} className="w-4 h-4 mr-2" />
            Yes, I'm a judge!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
