import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { walletService } from '../services/wallet.service';
import { TIERS, Tier } from '../constants/tiers';

const JUDGE_ACCESS_KEY = 'rogue_judge_access';
const JUDGE_MODAL_SHOWN_KEY = 'rogue_judge_modal_shown';
const TELEGRAM_MODAL_SHOWN_KEY = 'rogue_telegram_modal_shown';

interface JudgeAccess {
  expiresAt: number;
  walletAddress: string;
}

function getJudgeAccess(): JudgeAccess | null {
  try {
    const stored = localStorage.getItem(JUDGE_ACCESS_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function setJudgeAccess(walletAddress: string): void {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
  localStorage.setItem(JUDGE_ACCESS_KEY, JSON.stringify({ expiresAt, walletAddress }));
}

function hasJudgeModalBeenShown(walletAddress: string): boolean {
  try {
    const stored = localStorage.getItem(JUDGE_MODAL_SHOWN_KEY);
    if (!stored) return false;
    const shown: string[] = JSON.parse(stored);
    return shown.includes(walletAddress.toLowerCase());
  } catch {
    return false;
  }
}

function markJudgeModalShown(walletAddress: string): void {
  try {
    const stored = localStorage.getItem(JUDGE_MODAL_SHOWN_KEY);
    const shown: string[] = stored ? JSON.parse(stored) : [];
    if (!shown.includes(walletAddress.toLowerCase())) {
      shown.push(walletAddress.toLowerCase());
      localStorage.setItem(JUDGE_MODAL_SHOWN_KEY, JSON.stringify(shown));
    }
  } catch {
    localStorage.setItem(JUDGE_MODAL_SHOWN_KEY, JSON.stringify([walletAddress.toLowerCase()]));
  }
}

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
  const [actualTier, setActualTier] = useState<Tier>(TIERS.NONE);
  const [balance, setBalance] = useState(0);
  const [telegramConnected, setTelegramConnected] = useState(false);
  // Start as true to prevent flash of "tier required" content before data loads
  const [isLoading, setIsLoading] = useState(true);
  const [hasTemporaryAccess, setHasTemporaryAccess] = useState(false);
  const [shouldShowJudgeModal, setShouldShowJudgeModal] = useState(false);
  const [shouldShowTelegramModal, setShouldShowTelegramModal] = useState(false);

  // Check for temporary diamond access
  const checkTemporaryAccess = useCallback((walletAddr: string) => {
    const access = getJudgeAccess();
    if (access && 
        access.walletAddress.toLowerCase() === walletAddr.toLowerCase() && 
        access.expiresAt > Date.now()) {
      setHasTemporaryAccess(true);
      return true;
    }
    setHasTemporaryAccess(false);
    return false;
  }, []);

  // Grant temporary diamond access
  const grantTemporaryAccess = useCallback(async () => {
    if (address) {
      try {
        // Call backend to persist temporary access
        await walletService.grantTemporaryAccess(address);
        // Also store locally for immediate UI updates
        setJudgeAccess(address);
        setHasTemporaryAccess(true);
        setTier(TIERS.DIAMOND);
      } catch (error) {
        console.error('Failed to grant temporary access:', error);
        // Still set local access even if backend fails
        setJudgeAccess(address);
        setHasTemporaryAccess(true);
        setTier(TIERS.DIAMOND);
      }
    }
  }, [address]);

  // Mark modal as shown for this wallet
  const markModalShown = useCallback(() => {
    if (address) {
      markJudgeModalShown(address);
      setShouldShowJudgeModal(false);
    }
  }, [address]);

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
      
      // Check if modal should be shown (first time for this wallet)
      const modalShown = hasJudgeModalBeenShown(address);
      setShouldShowJudgeModal(!modalShown);
      
      // Check if telegram modal should be shown
      const telegramModalShown = hasTelegramModalBeenShown(address);
      setShouldShowTelegramModal(!telegramModalShown);
      
      // Check for existing temporary access
      const hasTempAccess = checkTemporaryAccess(address);
      
      walletService.verifyTier(address)
        .then(data => {
          setActualTier(data.tier);
          // If user has temporary access, override with DIAMOND
          setTier(hasTempAccess ? TIERS.DIAMOND : data.tier);
          setBalance(data.balance);
          setTelegramConnected(data.telegram_connected);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setTier(TIERS.NONE);
      setActualTier(TIERS.NONE);
      setBalance(0);
      setTelegramConnected(false);
      setHasTemporaryAccess(false);
      setShouldShowJudgeModal(false);
      setShouldShowTelegramModal(false);
      // Only set loading to false when we know there's no wallet connected
      setIsLoading(false);
    }
  }, [isConnected, address, checkTemporaryAccess]);

  // Update tier when temporary access changes
  useEffect(() => {
    if (hasTemporaryAccess) {
      setTier(TIERS.DIAMOND);
    } else {
      setTier(actualTier);
    }
  }, [hasTemporaryAccess, actualTier]);

  return {
    tier,
    actualTier,
    balance,
    telegramConnected,
    isLoading,
    isConnected,
    hasTemporaryAccess,
    shouldShowJudgeModal,
    shouldShowTelegramModal,
    grantTemporaryAccess,
    markModalShown,
    markTelegramModalShown
  };
}
