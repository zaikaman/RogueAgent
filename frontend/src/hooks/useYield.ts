import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api.service';

export interface YieldOpportunity {
  pool_id: string;
  protocol: string;
  chain: string;
  symbol: string;
  apy: number;
  tvl: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Degen';
  analysis: string;
  url?: string;
}

export interface ScanStatus {
  isScanning: boolean;
  lastScanTime: string | null;
  nextScanTime: string | null;
  scanIntervalHours: number;
  hasOpportunities?: boolean;
}

interface YieldResponse {
  opportunities: YieldOpportunity[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  scan_status?: ScanStatus;
}

export function useYield(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['yield', page, limit],
    queryFn: async () => {
      const response = await api.get<YieldResponse>(endpoints.yield, { params: { page, limit } });
      return response.data;
    },
    refetchInterval: 1000 * 60 * 15, // 15 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
