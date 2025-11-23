import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from './ui/button';
import { Loader2, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useState } from 'react';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);

  const handleConnect = (connector: any) => {
    connect({ connector });
    setIsOpen(false);
  };

  // Trigger callback when connected
  if (isConnected && address && onConnect) {
    // We might want to debounce this or handle it in a useEffect in the parent
    // But for now, let's just expose the address
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-1.5 bg-green-900/30 border border-green-500/50 rounded text-green-400 font-mono text-sm">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => disconnect()}
          className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-mono text-cyan-400">Select Wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              variant="outline"
              className="w-full justify-start text-left font-mono border-slate-700 hover:bg-slate-800 hover:text-cyan-400 h-12"
            >
              <span className="capitalize">{connector.name}</span>
              {isPending && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
