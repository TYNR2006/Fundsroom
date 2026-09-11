import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { pool } from './config/db';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({
    success: true,
    message: 'Fundsroom ERP API is running',
  });
});

app.get('/api/health/db', async (_request: Request, response: Response, next: NextFunction) => {
  try {
    const result = await pool.query<{ current_time: Date }>(
      'SELECT CURRENT_TIMESTAMP AS current_time',
    );

    response.json({
      success: true,
      message: 'Database connection is working',
      data: {
        currentTime: result.rows[0].current_time,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

export default app;
