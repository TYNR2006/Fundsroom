import { Router } from 'express';
import * as controller from '../controllers/product.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', controller.listMovements);

export default router;
