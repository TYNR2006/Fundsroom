import { Router } from 'express';
import * as controller from '../controllers/product.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(requireAuth);
router.get('/', controller.list);
router.get('/:id/stock-movements', controller.movements);
router.post('/:id/stock/in', requireRole('ADMIN', 'WAREHOUSE'), controller.addStock);
router.post('/:id/stock/out', requireRole('ADMIN', 'WAREHOUSE'), controller.removeStock);
router.get('/:id', controller.get);
router.post('/', requireRole('ADMIN'), controller.create);
router.put('/:id', requireRole('ADMIN'), controller.update);

export default router;
