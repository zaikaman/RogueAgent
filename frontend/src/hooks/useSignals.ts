import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api.service';

export interface Signal {
  id: string;
  type: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  timestamp: string;
  price?: number;
  status?: 'PENDING' | 'EXECUTED' | 'FAILED';
  metadata?: any;
}

interface SignalsResponse {
  data: Signal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useSignalsHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['signalsHistory', page, limit],
    queryFn: async () => {
      const response = await api.get<SignalsResponse>(endpoints.signalsHistory, {
        params: { page, limit }
      });
      return response.data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
