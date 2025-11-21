import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.service';
import { useAccount } from 'wagmi';

export function useLogs(page: number = 1, limit: number = 10) {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['logs', page, limit, address],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const response = await api.get('/logs', {
        params: { limit, offset, address }
      });
      return response.data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
