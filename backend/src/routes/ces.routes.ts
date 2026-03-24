import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkCesStatus, submitCes } from '../controllers/ces.controller';

const router = Router();

router.use(authenticate);

router.get('/check', checkCesStatus);
router.post('/', submitCes);

export default router;
