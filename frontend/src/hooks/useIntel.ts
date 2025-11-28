import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api.service';
import { useAccount } from 'wagmi';

export interface IntelItem {
  id: string;
  created_at: string;
  type?: string;
  content: {
    tweet_text?: string;
    blog_post?: string;
    formatted_thread?: string;
    topic?: string;
    image_url?: string;
    long_form_content?: string;
    headline?: string;
    tldr?: string;
  };
  public_posted_at?: string;
}

interface IntelResponse {
  data: IntelItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

export function useIntelDetail(id?: string) {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['intelDetail', id, address],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<IntelItem>(`${endpoints.intelDetail}/${id}`, {
        params: { address }
      });
      return response.data;
    },
    enabled: !!id,
  });
}
