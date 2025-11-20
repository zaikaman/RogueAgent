import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './api/routes';
import { config } from './config/env.config';

export const createServer = () => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // Routes
  app.use('/api', apiRoutes);

  // Root route
  app.get('/', (req, res) => {
    res.json({ 
      service: 'Rogue Agent Backend', 
      version: '1.0.0',
      status: 'running' 
    });
  });

  return app;
};
