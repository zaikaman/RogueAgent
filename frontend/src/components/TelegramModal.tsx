import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function TelegramModal({ isOpen, onClose, walletAddress }: TelegramModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Connect Telegram</DialogTitle>
          <DialogDescription className="text-gray-400">
            To receive real-time alpha signals, you need to link your Telegram account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm text-gray-300">
          <p>1. - <a href="https://t.me/rogueadkbot" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">@Rogue</a></p>
          <p>2. Send the following command to the bot:</p>
          <div className="bg-gray-950 p-3 rounded border border-gray-800 font-mono text-xs select-all">
            /verify {walletAddress}
          </div>
          <p>3. Once verified, you will automatically start receiving signals.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
