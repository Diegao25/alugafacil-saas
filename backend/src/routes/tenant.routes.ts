import { Router } from 'express';
import { createTenant, getTenants, getTenantById, updateTenant, deleteTenant } from '../controllers/tenant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkTrial } from '../middleware/trial.middleware';

const router = Router();

router.use(authenticate);
router.use(checkTrial);

router.post('/', createTenant);
router.get('/', getTenants);
router.get('/:id', getTenantById);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);

export default router;
