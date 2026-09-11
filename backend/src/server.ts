import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`Fundsroom ERP API listening on port ${port}`);
});
