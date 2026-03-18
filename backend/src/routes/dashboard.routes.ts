import { Router } from 'express';
import { getStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkTrial } from '../middleware/trial.middleware';

const router = Router();

router.get('/stats', authenticate, checkTrial, getStats);

export default router;
