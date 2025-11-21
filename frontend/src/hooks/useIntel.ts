import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api.service';
import { useAccount } from 'wagmi';

export interface IntelItem {
  id: string;
  created_at: string;
  content: {
    tweet_text?: string;
    blog_post?: string;
    formatted_thread?: string;
    topic?: string;
    image_url?: string;
  };
  public_posted_at?: string;
}

interface IntelResponse {
  data: IntelItem[];
}

export function useIntelHistory(page = 1, limit = 10) {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['intelHistory', page, limit, address],
    queryFn: async () => {
      const response = await api.get<IntelResponse>(endpoints.intelHistory, {
        params: { page, limit, address }
      });
      return response.data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
