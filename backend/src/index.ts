import { createServer } from './server';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';
import { telegramService } from './services/telegram.service';
import { orchestrator } from './agents/orchestrator';

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

  // Start Swarm Scheduler
  const intervalMs = config.RUN_INTERVAL_MINUTES * 60 * 1000;
  logger.info(`Starting Swarm Scheduler (Interval: ${config.RUN_INTERVAL_MINUTES}m)`);
  
  // Run immediately on startup (with a slight delay)
  setTimeout(() => {
    logger.info('Triggering initial swarm run...');
    orchestrator.runSwarm().catch(err => logger.error('Initial swarm run failed:', err));
  }, 5000);

  setInterval(() => {
    logger.info('Triggering scheduled swarm run...');
    orchestrator.runSwarm().catch(err => logger.error('Scheduled swarm run failed:', err));
  }, intervalMs);
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

