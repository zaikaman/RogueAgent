import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api.service';

export interface Signal {
  id: string;
  created_at: string;
  public_posted_at: string | null;
  content: {
    token: {
      symbol: string;
      name: string;
      contract_address: string;
    };
    action?: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    analysis: string;
    entry_price: number;
    target_price: number;
    stop_loss: number;
    status?: 'active' | 'tp_hit' | 'sl_hit' | 'closed';
    pnl_percent?: number;
    current_price?: number;
    trigger_event?: any;
    formatted_tweet?: string;
  };
}

interface SignalsResponse {
  data: Signal[];
  pagination?: {
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
