import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { walletService } from '../services/wallet.service';
import { TIERS, Tier } from '../constants/tiers';

const TELEGRAM_MODAL_SHOWN_KEY = 'rogue_telegram_modal_shown';

function hasTelegramModalBeenShown(walletAddress: string): boolean {
  try {
    const stored = localStorage.getItem(TELEGRAM_MODAL_SHOWN_KEY);
    if (!stored) return false;
    const shown: string[] = JSON.parse(stored);
    return shown.includes(walletAddress.toLowerCase());
  } catch {
    return false;
  }
}

function markTelegramModalShownStorage(walletAddress: string): void {
  try {
    const stored = localStorage.getItem(TELEGRAM_MODAL_SHOWN_KEY);
    const shown: string[] = stored ? JSON.parse(stored) : [];
    if (!shown.includes(walletAddress.toLowerCase())) {
      shown.push(walletAddress.toLowerCase());
      localStorage.setItem(TELEGRAM_MODAL_SHOWN_KEY, JSON.stringify(shown));
    }
  } catch {
    localStorage.setItem(TELEGRAM_MODAL_SHOWN_KEY, JSON.stringify([walletAddress.toLowerCase()]));
  }
}

export function useUserTier() {
  const { address, isConnected } = useAccount();
  const [tier, setTier] = useState<Tier>(TIERS.NONE);
  const [balance, setBalance] = useState(0);
  const [telegramConnected, setTelegramConnected] = useState(false);
  // Start as true to prevent flash of "tier required" content before data loads
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowTelegramModal, setShouldShowTelegramModal] = useState(false);

  // Mark telegram modal as shown for this wallet
  const markTelegramModalShown = useCallback(() => {
    if (address) {
      markTelegramModalShownStorage(address);
      setShouldShowTelegramModal(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      setIsLoading(true);

      // Check if telegram modal should be shown
      const telegramModalShown = hasTelegramModalBeenShown(address);
      setShouldShowTelegramModal(!telegramModalShown);

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
      setShouldShowTelegramModal(false);
      // Only set loading to false when we know there's no wallet connected
      setIsLoading(false);
    }
  }, [isConnected, address]);

  return {
    tier,
    balance,
    telegramConnected,
    isLoading,
    isConnected,
    shouldShowTelegramModal,
    markTelegramModalShown
  };
}
