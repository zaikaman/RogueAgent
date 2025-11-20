import { createServer } from './server';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';
import { telegramService } from './services/telegram.service';
import { orchestrator } from './agents/orchestrator';
import { supabaseService } from './services/supabase.service';

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
  
  // Smart scheduling based on DB history
  const scheduleSwarm = async () => {
    try {
      const lastRun = await supabaseService.getLatestRun();
      let delay = 5000; // Default small delay for first run ever

      if (lastRun && lastRun.created_at) {
        const lastRunTime = new Date(lastRun.created_at).getTime();
        const now = Date.now();
        const timeSinceLastRun = now - lastRunTime;
        
        if (timeSinceLastRun < intervalMs) {
          delay = intervalMs - timeSinceLastRun;
          logger.info(`Last run was ${Math.round(timeSinceLastRun / 1000 / 60)}m ago. Next run in ${Math.round(delay / 1000 / 60)}m`);
        } else {
          logger.info(`Last run was ${Math.round(timeSinceLastRun / 1000 / 60)}m ago. Running immediately.`);
          delay = 5000; // Run soon
        }
      } else {
        logger.info('No previous runs found. Running immediately.');
      }

      setTimeout(() => {
        // Run immediately (or after calculated delay)
        logger.info('Triggering swarm run...');
        orchestrator.runSwarm().catch(err => logger.error('Swarm run failed:', err));

        // Then start regular interval
        setInterval(() => {
          logger.info('Triggering scheduled swarm run...');
          orchestrator.runSwarm().catch(err => logger.error('Scheduled swarm run failed:', err));
        }, intervalMs);
      }, delay);

    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
      // Fallback to default behavior
      setTimeout(() => {
        orchestrator.runSwarm().catch(err => logger.error('Initial swarm run failed:', err));
        setInterval(() => {
          orchestrator.runSwarm().catch(err => logger.error('Scheduled swarm run failed:', err));
        }, intervalMs);
      }, 5000);
    }
  };

  scheduleSwarm();
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

