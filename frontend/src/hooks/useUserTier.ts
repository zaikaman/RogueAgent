import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { walletService } from '../services/wallet.service';
import { TIERS, Tier } from '../constants/tiers';

export function useUserTier() {
  const { address, isConnected } = useAccount();
  const [tier, setTier] = useState<Tier>(TIERS.NONE);
  const [balance, setBalance] = useState(0);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
