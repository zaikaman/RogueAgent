import { createServer } from './server';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';
import { telegramService } from './services/telegram.service';

const app = createServer();
const port = config.PORT;

const server = app.listen(port, () => {
  logger.info(`Server is running at http://localhost:${port}`);
  logger.info(`Environment: ${config.NODE_ENV}`);

  // Start Telegram bot
  if (config.TELEGRAM_BOT_TOKEN) {
    telegramService.setupCommandHandlers();
    telegramService.startPolling();
  }
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  // Stop Telegram bot
  if (config.TELEGRAM_BOT_TOKEN) {
    logger.info('Stopping Telegram bot...');
    telegramService.stopPolling();
  }

  // Close server
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

