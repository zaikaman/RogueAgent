import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

export class IqAiService {
  private readonly baseUrl = 'https://app.iqai.com/api';

  async postLog(content: string, type: 'Agent' | 'Developer' = 'Agent', txHash?: string, chainId?: string) {
    if (!config.IQAI_API_KEY || !config.AGENT_TOKEN_CONTRACT) {
      logger.warn('IQAI_API_KEY or AGENT_TOKEN_CONTRACT not configured. Skipping log post.');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': config.IQAI_API_KEY
        },
        body: JSON.stringify({
          agentTokenContract: config.AGENT_TOKEN_CONTRACT,
          content,
          type,
          txHash,
          chainId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`Failed to post log to IQ AI: ${response.status} ${response.statusText}`, errorData);
        return;
      }

      const data = await response.json();
      logger.info('Successfully posted log to IQ AI', data);
      return data;
    } catch (error) {
      logger.error('Error posting log to IQ AI:', error);
    }
  }
}

export const iqAiService = new IqAiService();
