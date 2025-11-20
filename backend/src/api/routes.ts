import { Router } from 'express';
import * as runController from './run.controller';
import * as statusController from './status.controller';
import * as logsController from './logs.controller';
import { tiersController } from './tiers.controller';
import { customRequestsController } from './custom-requests.controller';
import * as usersController from './users.controller';

import * as healthController from './health.controller';

const router = Router();

// Health check
router.get('/health', healthController.healthCheck);

// Trigger run
router.post('/run', runController.triggerRun);

// Status and Logs
router.get('/run-status', statusController.getLatestStatus);
router.get('/logs', logsController.getLogs);

// Tiers
router.use('/tiers', tiersController);

// Users
router.post('/users/telegram', usersController.updateTelegramUser);

// Custom Requests
router.use('/custom-requests', customRequestsController);

export default router;
