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
}

export function useYield() {
  return useQuery({
    queryKey: ['yield'],
    queryFn: async () => {
      const { data } = await api.get<YieldResponse>(endpoints.yield);
      return data.opportunities;
    },
    refetchInterval: 1000 * 60 * 15, // 15 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
