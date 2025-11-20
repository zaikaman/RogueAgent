import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from './ui/button';
import { Loader2, Wallet } from 'lucide-react';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    const connector = connectors[0]; // Injected connector
    connect({ connector });
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
    <Button 
      onClick={handleConnect} 
      disabled={isPending}
      className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="mr-2 h-4 w-4" />
      )}
      Connect Wallet
    </Button>
  );
}
