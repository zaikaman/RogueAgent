import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.service';
import { useAccount } from 'wagmi';

export function useRunStatus() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['runStatus', address],
    queryFn: async () => {
      const response = await api.get('/run-status', {
        params: { address }
      });
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}
