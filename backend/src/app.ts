import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { pool } from './config/db';
import authRouter from './routes/auth.routes';
import customerRouter from './routes/customer.routes';
import productRouter from './routes/product.routes';
import stockMovementRouter from './routes/stock-movement.routes';
import challanRouter from './routes/challan.routes';
import dashboardRouter from './routes/dashboard.routes';
import userRouter from './routes/user.routes';

dotenv.config();

const app = express();

app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins?.length ? allowedOrigins : true,
}));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/stock-movements', stockMovementRouter);
app.use('/api/challans', challanRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', userRouter);

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
