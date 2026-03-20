import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkNpsStatus, submitNps } from '../controllers/nps.controller';

const router = Router();

router.use(authenticate);

router.get('/check', checkNpsStatus);
router.post('/', submitNps);

export default router;
