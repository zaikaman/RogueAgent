import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.service';

export function useRunStatus() {
  return useQuery({
    queryKey: ['runStatus'],
    queryFn: async () => {
      const response = await api.get('/run-status');
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}
