import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.service';
import { useAccount } from 'wagmi';

export interface PredictionMarket {
  id: string;
  market_id: string;
  platform: 'Polymarket' | 'Azuro' | 'SX Network' | 'Degen';
  title: string;
  description: string | null;
  category: string | null;
  yes_price: number;
  implied_probability: number;
  rogue_probability: number;
  edge_percent: number;
  recommended_bet: 'BUY YES' | 'BUY NO' | 'HOLD';
  confidence_score: number;
  volume_usd: number;
  liquidity_usd: number;
  expiration_date: string | null;
  market_url: string;
  image_url: string | null;
  is_active: boolean;
  analysis_reasoning: string;
  last_analyzed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScanStatus {
  isScanning: boolean;
  lastScanTime: string | null;
  nextScanTime: string | null;
  scanIntervalHours: number;
  hasMarkets?: boolean;
}

interface PredictionsResponse {
  markets: PredictionMarket[];
  total: number;
  tier: 'DIAMOND' | 'PUBLIC';
  scan_status: ScanStatus;
  message?: string;
}

export function usePredictions() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['predictions', address],
    queryFn: async () => {
      const response = await api.get<PredictionsResponse>('/predictions', {
        params: { wallet: address, limit: 15 },
      });
      return response.data;
    },
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    staleTime: 1000 * 60 * 2, // Consider stale after 2 minutes
  });
}

export function usePredictionStatus() {
  return useQuery({
    queryKey: ['predictions-status'],
    queryFn: async () => {
      const response = await api.get<ScanStatus & { hasMarkets: boolean }>('/predictions/status');
      return response.data;
    },
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
}

export async function triggerManualScan(walletAddress: string): Promise<{ message: string; status: ScanStatus }> {
  const response = await api.post('/predictions/scan', { wallet: walletAddress });
  return response.data;
}
