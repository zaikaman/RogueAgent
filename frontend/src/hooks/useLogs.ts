import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.service';

export function useLogs(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ['logs', page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const response = await api.get('/logs', {
        params: { limit, offset }
      });
      return response.data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
