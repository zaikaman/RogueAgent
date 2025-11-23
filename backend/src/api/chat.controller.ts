import { Request, Response } from 'express';
import { InitialChatAgent } from '../agents/initial-chat.agent';
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

      // Step 1: Call InitialChatAgent (GPT-4o with database tools)
      const initialAgent = await InitialChatAgent;
      const initialResult = await initialAgent.runner.ask(agentInput);

      // Step 2: Check if web search is needed
      if (initialResult.needs_web_search) {
        // Route to ChatAgent (Grok) with context
        const grokInput = `
USER CONTEXT:
- Wallet: ${context?.walletAddress || 'Unknown'}
- Tier: ${context?.tier || 'NONE'}
- Telegram ID: ${context?.telegramUserId || 'Unknown'}

ROUTING CONTEXT:
The user's question requires real-time web/X search capabilities.
Reasoning: ${initialResult.reasoning}

CHAT HISTORY:
${history?.map((h: any) => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n') || 'None'}

USER MESSAGE: ${message}
        `.trim();

        const grokAgent = await ChatAgent;
        const grokResult = await grokAgent.runner.ask(grokInput);

        res.json({ message: grokResult, source: 'grok' });
      } else {
        // Use the direct response from InitialChatAgent
        res.json({ message: initialResult.response, source: 'gpt4o' });
      }
    } catch (error: any) {
      logger.error('Error in Chat Controller', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  }
};
