import { Request, Response } from 'express';
import { InitialChatAgent } from '../agents/initial-chat.agent';
import { ChatAgent } from '../agents/chat.agent';
import { logger } from '../utils/logger.util';
import { chatJobsService } from '../services/chat-jobs.service';

export const chatController = {
  // Async chat - creates a job and returns job ID for polling
  async chat(req: Request, res: Response) {
    try {
      const { message, context, history } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Create a chat job for background processing
      const job = await chatJobsService.createJob({
        user_wallet_address: context?.walletAddress || 'anonymous',
        message,
        context: context || {},
        history: history || [],
      });

      if (!job) {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create chat job' 
        });
      }

      // Process the job asynchronously in the background
      processChatJob(job.id, message, context, history)
        .catch((err) => logger.error('Error processing chat job:', err));

      res.json({
        success: true,
        job_id: job.id,
      });
    } catch (error: any) {
      logger.error('Error in Chat Controller', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  },

  // Get chat job status - for frontend polling
  async getChatStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({ error: 'jobId is required' });
      }

      const job = await chatJobsService.getJob(jobId);
      logger.info(`Chat job status check: ${jobId} -> ${job?.status}, response length: ${job?.response?.length || 0}`);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Return status and response if completed
      if (job.status === 'completed') {
        res.json({
          success: true,
          status: 'completed',
          message: job.response,
          source: job.source,
        });
      } else if (job.status === 'failed') {
        res.json({
          success: false,
          status: 'failed',
          error: job.error_message || 'Chat processing failed. Please try again.',
        });
      } else {
        // Still processing (pending or processing)
        res.json({
          success: true,
          status: job.status,
        });
      }
    } catch (error: any) {
      logger.error('Error in getChatStatus', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat status',
      });
    }
  },
};

// Background job processor
async function processChatJob(
  jobId: string,
  message: string,
  context: any,
  history: any[]
): Promise<void> {
  try {
    // Mark as processing
    await chatJobsService.markProcessing(jobId);

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
    const initialResult: any = await initialAgent.runner.ask(agentInput);
    
    logger.info(`InitialChatAgent result for job ${jobId}:`, JSON.stringify(initialResult));

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

      await chatJobsService.markCompleted(jobId, {
        response: grokResult || 'Sorry, I could not generate a response.',
        source: 'grok',
      });
    } else {
      // Use the direct response from InitialChatAgent
      const responseText = initialResult.response || initialResult.reasoning || 'Sorry, I could not generate a response.';
      await chatJobsService.markCompleted(jobId, {
        response: responseText,
        source: 'gpt4o',
      });
    }
  } catch (error: any) {
    logger.error(`Error processing chat job ${jobId}:`, error);
    await chatJobsService.markFailed(jobId, error.message || 'Unknown error');
  }
}
