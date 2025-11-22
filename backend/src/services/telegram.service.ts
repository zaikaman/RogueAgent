import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private channelId: string | undefined;
  private chatHistory: Map<number, Array<{ role: 'user' | 'assistant', content: string }>> = new Map();

  constructor() {
    if (config.TELEGRAM_BOT_TOKEN) {
      // Polling false initially, will be enabled if we need to listen for messages
      this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: false });
      this.channelId = config.TELEGRAM_CHANNEL_ID;
      logger.info('TelegramService initialized');
    } else {
      logger.warn('TELEGRAM_BOT_TOKEN not found, TelegramService disabled');
    }
  }

  async sendMessage(message: string, chatId?: string): Promise<boolean> {
    if (!this.bot) {
      logger.warn('TelegramService not initialized, skipping message');
      return false;
    }

    const targetChatId = chatId || this.channelId;

    if (!targetChatId) {
      logger.warn('No chat ID provided for Telegram message');
      return false;
    }

    // If targetChatId is a placeholder or invalid, skip
    if (targetChatId === '@YourTelegramChannel') {
      logger.warn('Telegram channel ID is set to default placeholder. Skipping message.');
      return false;
    }

    try {
      await retry(() => this.bot!.sendMessage(targetChatId, message, { parse_mode: 'Markdown' }));
      logger.info(`Telegram message sent to ${targetChatId}`);
      return true;
    } catch (error: any) {
      // Handle 403 Forbidden specifically
      if (error.response && error.response.statusCode === 403) {
        logger.warn(`Telegram 403 Forbidden: Bot cannot message ${targetChatId}. User may not have started bot or bot is not in channel.`);
        return false;
      }
      logger.error('Failed to send Telegram message after retries', error);
      return false;
    }
  }

  startPolling() {
    if (this.bot) {
        this.bot.startPolling();
        logger.info('Telegram polling started');
    }
  }
  
  stopPolling() {
    if (this.bot && this.bot.isPolling()) {
      this.bot.stopPolling();
    }
  }
  
  getBot() {
      return this.bot;
  }

  async setupCommandHandlers() {
    if (!this.bot) return;

    // Dynamic imports to avoid potential circular dependencies during initialization
    const { tierManager } = await import('../agents/tier-manager.agent');
    const { SupabaseService } = await import('./supabase.service');
    const supabaseService = new SupabaseService();

    this.bot.onText(/\/verify (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const walletAddress = match?.[1];

      if (!walletAddress) {
        this.bot?.sendMessage(chatId, 'Please provide a wallet address: /verify <address>');
        return;
      }

      try {
        await this.bot?.sendMessage(chatId, 'Verifying wallet...');
        
        const { tier, balance } = await tierManager.verifyTier(walletAddress);

        await supabaseService.upsertUser({
          wallet_address: walletAddress,
          tier,
          last_verified_at: new Date().toISOString(),
          telegram_user_id: msg.from?.id,
          telegram_username: msg.from?.username,
        });

        await this.bot?.sendMessage(chatId, `✅ Verified! You are **${tier}** tier (${balance.toFixed(2)} RGE).`, { parse_mode: 'Markdown' });
        
      } catch (error) {
        logger.error('Error in Telegram verify handler', error);
        await this.bot?.sendMessage(chatId, '❌ Verification failed. Please check the address and try again.');
      }
    });
    
    this.bot.onText(/\/start/, (msg) => {
        const welcomeMessage = `
Welcome to **Rogue Agent**! 🕵️‍♂️

I am your AI-powered crypto intelligence assistant.

**Getting Started:**
1. Verify your wallet: \`/verify <wallet_address>\`
2. Once verified, you can chat with me about the market!

**Commands:**
/verify <address> - Link your wallet to unlock features
/scan <token> - Request a deep-dive analysis (Diamond Tier)
/help - Show available commands
        `;
        this.bot?.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/help/, (msg) => {
        const helpMessage = `
**Rogue Agent Commands** 🛠️

**/verify <wallet_address>**
Link your wallet to access your tier benefits.
Example: \`/verify 0x123...\`

**/scan <token_symbol>**
Request a deep-dive analysis for a specific token.
*Exclusive to DIAMOND tier users.*
Example: \`/scan SOL\`

**Chat Features** 💬
You can chat with me normally! Ask about:
- Market trends
- Token prices
- Crypto news
- General questions

*Note: Custom scans are currently limited to Diamond tier users.*
        `;
        this.bot?.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
    });
    
    // /scan command for explicit token scans
    this.bot.onText(/\/scan (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const tokenSymbol = match?.[1];
      
      if (!userId || !tokenSymbol) return;

      try {
        const user = await supabaseService.getUserByTelegramId(userId);
        
        if (!user) {
          await this.bot?.sendMessage(chatId, '👋 Please verify your wallet first using /verify <wallet_address>');
          return;
        }

        // Import ChatAgent dynamically
        const { ChatAgent } = await import('../agents/chat.agent');
        const { runner } = await ChatAgent.build();
        
        // Build prompt for explicit scan request
        const promptWithContext = `USER CONTEXT:
- Wallet: ${user.wallet_address}
- Tier: ${user.tier}
- Telegram ID: ${userId}

USER MESSAGE: scan ${tokenSymbol}`;
        
        const result = await runner.ask(promptWithContext) as any;
        
        const responseMessage = result?.message || "I'm having trouble processing that scan request.";
        await this.bot?.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
        
      } catch (error) {
        logger.error('Error in /scan command', error);
        await this.bot?.sendMessage(chatId, '❌ An error occurred while processing your scan request.');
      }
    });

    // Main message handler - route through ChatAgent
    this.bot.on('message', async (msg) => {
      // Ignore commands (they have their own handlers)
      if (msg.text && msg.text.startsWith('/')) return;
      
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const userMessage = msg.text;
      
      if (!userId || !userMessage) return;

      try {
        // Get user from DB to pass context to ChatAgent
        const user = await supabaseService.getUserByTelegramId(userId);
        
        if (!user) {
          await this.bot?.sendMessage(chatId, '👋 Hi! Please verify your wallet first using /verify <wallet_address> to unlock all features.');
          return;
        }

        // Import ChatAgent dynamically
        const { ChatAgent } = await import('../agents/chat.agent');
        const { runner } = await ChatAgent.build();
        
        // Get history
        const history = this.chatHistory.get(userId) || [];
        
        // Format history
        const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');

        // Build prompt with user context embedded
        const promptWithContext = `USER CONTEXT:
- Wallet: ${user.wallet_address}
- Tier: ${user.tier}
- Telegram ID: ${userId}

CHAT HISTORY:
${historyText}

USER MESSAGE: ${userMessage}`;
        
        // Call ChatAgent
        const result = await runner.ask(promptWithContext) as any;
        
        // Send response
        const responseMessage = result?.message || "I'm having trouble processing that request right now.";
        
        // Update history
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: responseMessage });
        
        // Keep last 20 messages
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
        this.chatHistory.set(userId, history);

        await this.bot?.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
        
      } catch (error) {
        logger.error('Error in Telegram message handler', error);
        await this.bot?.sendMessage(chatId, '❌ An error occurred while processing your message.');
      }
    });
  }

  async broadcastIntel(content: string) {
    if (!this.bot) return;

    const { SupabaseService } = await import('./supabase.service');
    const supabaseService = new SupabaseService();

    // Fetch Gold and Diamond users
    const { data: users, error } = await supabaseService.getClient()
      .from('users')
      .select('telegram_user_id')
      .in('tier', ['GOLD', 'DIAMOND'])
      .not('telegram_user_id', 'is', null);

    if (error || !users) {
      logger.error('Failed to fetch users for broadcast', error);
      return;
    }

    logger.info(`Broadcasting intel to ${users.length} users...`);

    // Deduplicate users by telegram_user_id
    const uniqueUserIds = [...new Set(users.map(u => u.telegram_user_id))];

    for (const userId of uniqueUserIds) {
      if (userId) {
        try {
          // Split message if too long (simple split)
          const chunks = content.match(/[\s\S]{1,4000}/g) || [content];
          for (const chunk of chunks) {
             await this.bot.sendMessage(userId, chunk, { parse_mode: 'Markdown' });
          }
        } catch (err) {
          logger.warn(`Failed to send to user ${userId}`, err);
        }
      }
    }
  }

  async broadcastToTiers(content: string, tiers: string[]) {
    if (!this.bot) return;

    const { SupabaseService } = await import('./supabase.service');
    const supabaseService = new SupabaseService();

    // Fetch users in specific tiers
    const { data: users, error } = await supabaseService.getClient()
      .from('users')
      .select('telegram_user_id')
      .in('tier', tiers)
      .not('telegram_user_id', 'is', null);

    if (error || !users) {
      logger.error(`Failed to fetch users for broadcast to tiers ${tiers.join(',')}`, error);
      return;
    }

    logger.info(`Broadcasting to ${tiers.join(',')} (${users.length} users)...`);

    // Deduplicate users by telegram_user_id
    const uniqueUserIds = [...new Set(users.map(u => u.telegram_user_id))];

    for (const userId of uniqueUserIds) {
      if (userId) {
        try {
          // Split message if too long (simple split)
          const chunks = content.match(/[\s\S]{1,4000}/g) || [content];
          for (const chunk of chunks) {
             await this.bot.sendMessage(userId, chunk, { parse_mode: 'Markdown' });
          }
        } catch (err) {
          logger.warn(`Failed to send to user ${userId}`, err);
        }
      }
    }
  }
}

export const telegramService = new TelegramService();
