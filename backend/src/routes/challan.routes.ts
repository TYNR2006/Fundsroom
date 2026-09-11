import { Router } from 'express';
import * as controller from '../controllers/challan.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(requireAuth);
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', requireRole('ADMIN', 'SALES'), controller.create);
router.put('/:id', requireRole('ADMIN', 'SALES'), controller.update);

export default router;
