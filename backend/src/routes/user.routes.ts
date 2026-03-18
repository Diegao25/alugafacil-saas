import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { checkTrial } from '../middleware/trial.middleware';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';

const router = Router();

router.use(authenticate);
router.use(checkTrial);
router.use(requireAdmin);

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
