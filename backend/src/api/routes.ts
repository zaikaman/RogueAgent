import { Router } from 'express';
import * as runController from './run.controller';
import * as statusController from './status.controller';
import * as logsController from './logs.controller';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trigger run
router.post('/run', runController.triggerRun);

// Status and Logs
router.get('/run-status', statusController.getLatestStatus);
router.get('/logs', logsController.getLogs);

export default router;
