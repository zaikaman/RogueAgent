import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';
import { retry } from '../utils/retry.util';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private channelId: string | undefined;

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
        
        const { tier, usdValue } = await tierManager.verifyTier(walletAddress);

        await supabaseService.upsertUser({
          wallet_address: walletAddress,
          tier,
          rge_balance_usd: usdValue,
          last_verified_at: new Date().toISOString(),
          telegram_user_id: msg.from?.id,
          telegram_username: msg.from?.username,
        });

        await this.bot?.sendMessage(chatId, `✅ Verified! You are **${tier}** tier ($${usdValue.toFixed(2)} RGE).`, { parse_mode: 'Markdown' });
        
      } catch (error) {
        logger.error('Error in Telegram verify handler', error);
        await this.bot?.sendMessage(chatId, '❌ Verification failed. Please check the address and try again.');
      }
    });
    
    this.bot.onText(/\/start/, (msg) => {
        this.bot?.sendMessage(msg.chat.id, 'Welcome to Rogue Agent! Use /verify <wallet_address> to link your wallet and get early access.');
    });

    const handleScanRequest = async (msg: TelegramBot.Message, token: string) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      if (!userId || !token) return;

      try {
        const user = await supabaseService.getUserByTelegramId(userId);
        
        if (!user) {
           await this.bot?.sendMessage(chatId, '❌ You are not verified. Please use /verify <wallet_address> first.');
           return;
        }

        // Dynamic import to avoid circular dependency
        const { TIERS } = await import('../constants/tiers');
        
        if (user.tier !== TIERS.DIAMOND) {
           await this.bot?.sendMessage(chatId, '🔒 This feature is exclusive to **DIAMOND** tier users (1,000+ $RGE).', { parse_mode: 'Markdown' });
           return;
        }

        // Check Quota (Unlimited for Diamond)
        // const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        // const count = await supabaseService.getCustomRequestsCount(user.wallet_address, yesterday);

        // if (count >= 1) {
        //    await this.bot?.sendMessage(chatId, '⚠️ Daily quota exceeded. You can request another scan in 24 hours.');
        //    return;
        // }

        await this.bot?.sendMessage(chatId, `🕵️‍♂️ **Rogue Agent** is scanning **${token}** for you... This may take a minute.`, { parse_mode: 'Markdown' });

        // Create Request
        const request = await supabaseService.createCustomRequest({
          user_wallet_address: user.wallet_address,
          token_symbol: token,
          status: 'pending',
        });

        // Trigger Orchestrator
        const { orchestrator } = await import('../agents/orchestrator');
        // Fire and forget
        orchestrator.processCustomRequest(request.id, token, user.wallet_address);

      } catch (error) {
        logger.error('Error in Telegram scan handler', error);
        await this.bot?.sendMessage(chatId, '❌ An error occurred while processing your request.');
      }
    };

    this.bot.onText(/\/scan (.+)/, async (msg, match) => {
      if (match && match[1]) {
        await handleScanRequest(msg, match[1]);
      }
    });

    this.bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        await handleScanRequest(msg, msg.text);
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
