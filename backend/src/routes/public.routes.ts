import { Router } from 'express';
import { getPropertyAvailability } from '../controllers/public.controller';
import { serveSharedContract } from '../controllers/contract.controller';

const router = Router();

router.get('/properties/:id/availability', getPropertyAvailability);
router.get('/contracts/share', serveSharedContract);

export default router;
