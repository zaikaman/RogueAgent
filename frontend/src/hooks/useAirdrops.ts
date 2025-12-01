import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api.service';

export interface Airdrop {
  id: string;
  ticker: string;
  contract: string;
  chain: string;
  type: string;
  why_promising: string;
  tasks: string;
  deadline_or_phase: string;
  est_value_usd: string;
  link_dashboard: string;
  link_tg: string;
  link_x: string;
  rogue_score: number;
  created_at: string;
}

interface AirdropResponse {
  airdrops: Airdrop[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useAirdrops(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['airdrops', page, limit],
    queryFn: async () => {
      const response = await api.get<AirdropResponse>(endpoints.airdrops, { params: { page, limit } });
      return response.data;
    },
    refetchInterval: 1000 * 60 * 15, // 15 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch all airdrops for client-side filtering
export function useAllAirdrops() {
  return useQuery({
    queryKey: ['allAirdrops'],
    queryFn: async () => {
      const response = await api.get<AirdropResponse>(endpoints.airdrops, { params: { page: 1, limit: 1000 } });
      return response.data;
    },
    refetchInterval: 1000 * 60 * 15,
    staleTime: 1000 * 60 * 5,
  });
}
