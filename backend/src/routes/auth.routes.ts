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
import { acceptCurrentTerms, getCurrentTerms } from '../controllers/terms.controller';
import { authenticate } from '../middleware/auth.middleware';
import { createRateLimitMiddleware, getRequesterIp } from '../middleware/rateLimit.middleware';

function getNormalizedEmail(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase()
    : 'unknown-email';
}

const loginRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
  // Limits are scoped by IP + e-mail so one account does not block another
  // user logging in from the same network.
  keyGenerator: (req) => `login:${getRequesterIp(req)}:${getNormalizedEmail(req.body?.email)}`
});

const forgotPasswordRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas solicitações de recuperação. Tente novamente em alguns minutos.',
  keyGenerator: (req) => `forgot-password:${getRequesterIp(req)}:${getNormalizedEmail(req.body?.email)}`
});

const router = Router();

router.post('/register', register);
router.post('/login', loginRateLimit, login);
router.post('/forgot-password', forgotPasswordRateLimit, requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.get('/owner', authenticate, getOwnerProfile);
router.get('/terms/current', authenticate, getCurrentTerms);
router.post('/terms/accept', authenticate, acceptCurrentTerms);
router.put('/profile', authenticate, updateProfile);
router.post('/logout', logout);

export default router;
