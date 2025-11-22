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

import * as healthController from './health.controller';

const router = Router();

// Health check
router.get('/health', healthController.healthCheck);

// Trigger run
router.post('/run', runController.triggerRun);
router.get('/run/logs', runController.getRunLogs);

// Status and Logs
router.get('/run-status', statusController.getLatestStatus);
router.get('/logs', logsController.getLogs);

// Signals
router.get('/signals/history', signalsController.getSignalHistory);

// Intel
router.get('/intel/history', intelController.getIntelHistory);

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

export default router;
