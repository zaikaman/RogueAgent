import { Request, Response } from 'express';
import { orchestrator } from '../agents/orchestrator';

export const triggerRun = async (req: Request, res: Response) => {
  // Run in background to avoid timeout
  orchestrator.runSwarm().catch(err => console.error('Background run failed:', err));
  
  res.json({ 
    message: 'Swarm execution triggered successfully', 
    status: 'processing' 
  });
};
