import { Request, Response } from 'express';
import { ChatAgent } from '../agents/chat.agent';
import { logger } from '../utils/logger.util';

export const chatController = {
  async chat(req: Request, res: Response) {
    try {
      const { message, context, history } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Format the input for the agent
      const agentInput = `
USER CONTEXT:
- Wallet: ${context?.walletAddress || 'Unknown'}
- Tier: ${context?.tier || 'NONE'}
- Telegram ID: ${context?.telegramUserId || 'Unknown'}

CHAT HISTORY:
${history?.map((h: any) => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n') || 'None'}

USER MESSAGE: ${message}
      `.trim();

      // Build and run the agent (same pattern as telegram service)
      const { runner } = await ChatAgent.build();
      const result = await runner.ask(agentInput);

      res.json(result);
    } catch (error: any) {
      logger.error('Error in Chat Controller', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  }
};
