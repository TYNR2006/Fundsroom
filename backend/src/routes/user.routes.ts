import { Router } from 'express';
import * as controller from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));
router.get('/', controller.list);
router.post('/', controller.create);
export default router;
