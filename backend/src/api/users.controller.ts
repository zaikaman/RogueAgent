import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';

export const updateTelegramUser = async (req: Request, res: Response) => {
  const { walletAddress, telegramUsername } = req.body;

  if (!walletAddress || !telegramUsername) {
    return res.status(400).json({ error: 'Missing walletAddress or telegramUsername' });
  }

  try {
    // Clean username (remove @ if present)
    const cleanUsername = telegramUsername.replace('@', '');

    await supabaseService.upsertUser({
      wallet_address: walletAddress,
      telegram_username: cleanUsername,
      last_verified_at: new Date().toISOString(), // Update timestamp
    });

    logger.info(`Updated Telegram username for ${walletAddress}: ${cleanUsername}`);
    res.json({ success: true, message: 'Telegram username updated' });
  } catch (error: any) {
    logger.error('Error updating Telegram username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
