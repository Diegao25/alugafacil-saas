import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { checkTrial } from '../middleware/trial.middleware';
import { listUsers, createUser, updateUser, deleteUser, resendInvite } from '../controllers/user.controller';

const router = Router();

router.use(authenticate);
router.use(checkTrial);
router.use(requireAdmin);

router.get('/', listUsers);
router.post('/', createUser);
router.post('/:id/resend-invite', resendInvite);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
