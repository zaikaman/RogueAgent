import { Router } from 'express';
import * as runController from './run.controller';
import * as statusController from './status.controller';
import * as logsController from './logs.controller';
import { tiersController } from './tiers.controller';
import { customRequestsController } from './custom-requests.controller';
import * as usersController from './users.controller';
import * as signalsController from './signals.controller';
import * as intelController from './intel.controller';
import { yieldController } from './yield.controller';
import * as airdropsController from './airdrops.controller';
import { chatController } from './chat.controller';
import { vapiController } from './vapi.controller';
import { scanController } from './scan.controller';
import { futuresController } from './futures.controller';

import * as healthController from './health.controller';

const router = Router();

// Health check
router.get('/health', healthController.healthCheck);

// Chat
router.post('/chat', chatController.chat);

// Scan (DIAMOND tier only)
router.post('/scan', scanController.requestScan);

// VAPI Tools
router.post('/vapi/tools/signals', vapiController.getRecentSignals);
router.post('/vapi/tools/intel', vapiController.getRecentIntel);
router.post('/vapi/tools/yield', vapiController.getYieldOpportunities);
router.post('/vapi/tools/airdrops', vapiController.getAirdrops);
router.post('/vapi/tools/search', vapiController.searchWebAndX);

// Trigger run
router.post('/run', runController.triggerRun);
router.get('/run/logs', runController.getRunLogs);

// Status and Logs
router.get('/run-status', statusController.getLatestStatus);
router.get('/logs', logsController.getLogs);

// Signals
router.get('/signals/history', signalsController.getSignalHistory);
router.post('/signals/recalculate-pnl', signalsController.recalculateHistoricalPnL);

// Intel
router.get('/intel/history', intelController.getIntelHistory);
router.get('/intel/:id', intelController.getIntelById);

// Yield
router.get('/yield', yieldController.getOpportunities);

// Airdrops
router.get('/airdrops', airdropsController.getAirdrops);

// Tiers
router.use('/tiers', tiersController);

// Users
router.post('/users/telegram', usersController.updateTelegramUser);

// Custom Requests
router.use('/custom-requests', customRequestsController);

// Futures Agents (Diamond-only)
router.use('/futures', futuresController);

export default router;
