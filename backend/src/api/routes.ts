import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder routes - will be implemented in later phases
// router.post('/run', runController.triggerRun);
// router.get('/run-status', statusController.getLatestStatus);
// router.get('/logs', logsController.getLogs);

export default router;
