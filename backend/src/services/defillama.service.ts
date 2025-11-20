import axios from 'axios';
import { logger } from '../utils/logger.util';

const BASE_URL = 'https://api.llama.fi';

export const defillamaService = {
  async getGlobalTVL() {
    try {
      const response = await axios.get(`${BASE_URL}/v2/chains`);
      // Sum up TVL or just return the top chains
      const chains = response.data;
      const topChains = chains
        .sort((a: any, b: any) => b.tvl - a.tvl)
        .slice(0, 5)
        .map((c: any) => ({
          name: c.name,
          tvl: c.tvl,
          tokenSymbol: c.tokenSymbol
        }));
      
      return topChains;
    } catch (error) {
      logger.error('Error fetching DeFi Llama Global TVL', error);
      return [];
    }
  },

  async getProtocolStats() {
    try {
      // This endpoint returns all protocols, which is huge. 
      // We might want to filter or just get a few.
      // Alternatively, use /summary/protocols which might be lighter? No such endpoint documented commonly.
      // Let's stick to chains for now as it's high level intel.
      // Or maybe /protocols and sort by change_1d
      const response = await axios.get(`${BASE_URL}/protocols`);
      const protocols = response.data;
      
      const topGainers = protocols
        .filter((p: any) => p.tvl > 1000000) // Filter out small TVL
        .sort((a: any, b: any) => (b.change_1d || 0) - (a.change_1d || 0))
        .slice(0, 5)
        .map((p: any) => ({
          name: p.name,
          symbol: p.symbol,
          chain: p.chain,
          tvl: p.tvl,
          change_1d: p.change_1d
        }));

      return topGainers;
    } catch (error) {
      logger.error('Error fetching DeFi Llama Protocols', error);
      return [];
    }
  }
};
