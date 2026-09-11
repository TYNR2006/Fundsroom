import { Router } from 'express';
import { adminOnly, currentUser, login } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const authRouter = Router();

authRouter.post('/login', login);
authRouter.get('/me', requireAuth, currentUser);
authRouter.get('/admin-test', requireAuth, requireRole('ADMIN'), adminOnly);

export default authRouter;
