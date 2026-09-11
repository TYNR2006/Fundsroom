import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.get('/summary', controller.summary);
router.get('/inventory', controller.inventory);
router.get('/challans', controller.challans);
router.get('/activity', controller.activity);

export default router;
