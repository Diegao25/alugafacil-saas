import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  getOwnerProfile,
  logout
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { createRateLimitMiddleware } from '../middleware/rateLimit.middleware';

const loginRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.'
});

const forgotPasswordRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas solicitações de recuperação. Tente novamente em alguns minutos.'
});

const router = Router();

router.post('/register', register);
router.post('/login', loginRateLimit, login);
router.post('/forgot-password', forgotPasswordRateLimit, requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.get('/owner', authenticate, getOwnerProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/logout', logout);

export default router;
