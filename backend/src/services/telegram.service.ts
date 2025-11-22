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
/scan <token or address> - Request a deep-dive analysis (Diamond Tier)
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

**/scan <token_symbol or contract_address>**
Request a deep-dive analysis for a specific token.
*Exclusive to DIAMOND tier users.*
Examples: 
\`/scan SOL\`
\`/scan EvDWFiEhRWxpJM1wJHFpe6sy8M14KLTV2bNAh7r6pump\`

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
      const input = match?.[1]?.trim();
      
      if (!userId || !input) return;

      // Detect if input is an address (contains lowercase chars or is >20 chars) or a symbol
      const isAddress = input.length > 20 || /[a-z]/.test(input);
      const tokenSymbol = isAddress ? input : input.toUpperCase();
      const tokenContract = isAddress ? input : undefined;

      try {
        const user = await supabaseService.getUserByTelegramId(userId);
        
        if (!user) {
          await this.bot?.sendMessage(chatId, '👋 Please verify your wallet first using /verify <wallet_address>');
          return;
        }

        // Check tier
        const { TIERS } = await import('../constants/tiers');
        if (user.tier !== TIERS.DIAMOND) {
          await this.bot?.sendMessage(chatId, `⛔ Custom scans are exclusive to DIAMOND tier users (1,000+ $RGE).\n\nYour current tier: ${user.tier}`, { parse_mode: 'Markdown' });
          return;
        }

        // Create custom request directly
        console.log('📊 Creating custom request for:', { userId, tokenSymbol, tokenContract, wallet: user.wallet_address });
        const request = await supabaseService.createCustomRequest({
          user_wallet_address: user.wallet_address,
          token_symbol: tokenSymbol,
          token_contract: tokenContract,
          status: 'pending',
        });
        console.log('📊 Custom request created! ID:', request.id);

        // Trigger orchestrator (async)
        const { orchestrator } = await import('../agents/orchestrator');
        orchestrator.processCustomRequest(request.id, tokenSymbol, user.wallet_address)
          .catch((err: any) => logger.error('Error processing custom request:', err));

        await this.bot?.sendMessage(chatId, `🔍 Scan initiated for **${tokenSymbol}**.\n\nYou'll receive a detailed analysis via DM shortly.`, { parse_mode: 'Markdown' });
        
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

        // Build base prompt with user context embedded
        const basePrompt = `USER CONTEXT:
- Wallet: ${user.wallet_address}
- Tier: ${user.tier}
- Telegram ID: ${userId}

CHAT HISTORY:
${historyText}

USER MESSAGE: ${userMessage}`;
        
        // Retry logic for schema validation errors
        const maxAttempts = 3;
        let attempts = 0;
        let lastError: any;
        let result: any;

        while (attempts < maxAttempts) {
          try {
            attempts++;
            let currentPrompt = basePrompt;

            if (attempts > 1) {
              const errorMessage = lastError?.message || 'Unknown error';
              const isSchemaError = errorMessage.includes('schema') || 
                                    errorMessage.includes('validation') || 
                                    errorMessage.includes('parse') ||
                                    errorMessage.includes('JSON');
              
              if (isSchemaError) {
                currentPrompt = `${basePrompt}

⚠️ PREVIOUS ATTEMPT ${attempts - 1} FAILED DUE TO OUTPUT FORMATTING ERROR ⚠️

Error: ${errorMessage}

CRITICAL INSTRUCTIONS TO FIX:
1. You MUST return ONLY ONE valid JSON object that exactly matches the output schema
2. ALL required fields must be present: message (string), triggered_scan (boolean), token_scanned (string)
3. Do NOT output duplicate JSON objects
4. Do NOT include any text before or after the JSON
5. Do NOT include any error messages in the output
6. Ensure proper JSON syntax with no trailing commas or invalid characters
7. The message field should contain your response to the user

Please retry with correctly formatted output.`;
                logger.info(`ChatAgent retry attempt ${attempts}/${maxAttempts} due to validation error`);
              }
            }
            
            // Call ChatAgent
            console.log(`🤖 Calling ChatAgent (attempt ${attempts}/${maxAttempts}):`, currentPrompt);
            result = await runner.ask(currentPrompt) as any;
            console.log('🤖 ChatAgent returned:', JSON.stringify(result, null, 2));
            
            // Success - break out of retry loop
            if (attempts > 1) {
              logger.info(`ChatAgent succeeded on attempt ${attempts}/${maxAttempts}`);
            }
            break;
            
          } catch (error: any) {
            logger.warn(`ChatAgent attempt ${attempts}/${maxAttempts} failed:`, {
              message: error.message,
              error: error.toString()
            });
            lastError = error;
            
            if (attempts >= maxAttempts) {
              logger.error(`ChatAgent failed after ${maxAttempts} attempts. Last error:`, error);
              // Don't throw - send fallback message instead
              result = { message: "I'm having trouble processing that request right now. Please try again." };
              break;
            }
            
            // Wait before retry (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 3000);
            logger.info(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
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
