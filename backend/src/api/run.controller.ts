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

export const streamRun = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const onLog = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  orchestrator.on('log', onLog);

  req.on('close', () => {
    orchestrator.off('log', onLog);
  });
};
