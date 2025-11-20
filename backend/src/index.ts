import { createServer } from './server';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';
import { telegramService } from './services/telegram.service';

const app = createServer();
const port = config.PORT;

app.listen(port, () => {
  logger.info(`Server is running at http://localhost:${port}`);
  logger.info(`Environment: ${config.NODE_ENV}`);

  // Start Telegram bot
  if (config.TELEGRAM_BOT_TOKEN) {
    telegramService.setupCommandHandlers();
    telegramService.startPolling();
  }
});

