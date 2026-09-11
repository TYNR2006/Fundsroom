import dotenv from 'dotenv';
import app from './app';
import { closeDatabasePool } from './config/db';

dotenv.config();

const port = Number(process.env.PORT) || 5000;

const server = app.listen(port, () => {
  console.log(`Fundsroom ERP API listening on port ${port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Shutting down server.`);

  server.close(async () => {
    await closeDatabasePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
