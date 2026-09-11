import { Router } from 'express';
import { currentUser, login } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const authRouter = Router();

authRouter.post('/login', login);
authRouter.get('/me', requireAuth, currentUser);

export default authRouter;
