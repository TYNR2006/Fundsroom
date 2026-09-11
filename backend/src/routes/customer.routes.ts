import { Router } from 'express';
import * as controller from '../controllers/customer.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.get('/', controller.list);
router.get('/:id/follow-ups', controller.followUps);
router.post('/:id/follow-ups', controller.addFollowUp);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
export default router;
