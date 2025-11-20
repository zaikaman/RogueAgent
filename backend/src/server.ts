import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './api/routes';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';

export const createServer = () => {
  const app = express();

  // CORS Configuration
  const allowedOrigins = [
    'http://localhost:5173', // Vite dev
    'https://rogue-adk.vercel.app', // Production 
    process.env.FRONTEND_URL // Configurable
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1 && config.NODE_ENV === 'production') {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    }
  }));

  // Middleware
  app.use(helmet());
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

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      success: false,
      error: message,
      ...(config.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
};
