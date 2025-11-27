import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { walletService } from '../services/wallet.service';
import { TIERS, Tier } from '../constants/tiers';

export function useUserTier() {
  const { address, isConnected } = useAccount();
  const [tier, setTier] = useState<Tier>(TIERS.NONE);
  const [balance, setBalance] = useState(0);
  const [telegramConnected, setTelegramConnected] = useState(false);
  // Start as true to prevent flash of "tier required" content before data loads
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      setIsLoading(true);
      walletService.verifyTier(address)
        .then(data => {
          setTier(data.tier);
          setBalance(data.balance);
          setTelegramConnected(data.telegram_connected);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setTier(TIERS.NONE);
      setBalance(0);
      setTelegramConnected(false);
      // Only set loading to false when we know there's no wallet connected
      setIsLoading(false);
    }
  }, [isConnected, address]);

  return {
    tier,
    balance,
    telegramConnected,
    isLoading,
    isConnected
  };
}
