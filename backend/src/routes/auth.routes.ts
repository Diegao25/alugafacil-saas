import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  getOwnerProfile
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.get('/owner', authenticate, getOwnerProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
