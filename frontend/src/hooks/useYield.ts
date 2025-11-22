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

interface YieldResponse {
  opportunities: YieldOpportunity[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useYield(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['yield', page, limit],
    queryFn: async () => {
      const response = await api.get<YieldResponse>(endpoints.yield, { params: { page, limit } });
      // Backend may return { opportunities: [], pagination: { page, limit, total, pages } }
      return response.data;
    },
    refetchInterval: 1000 * 60 * 15, // 15 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
