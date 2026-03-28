import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  createCheckoutSession, 
  getSubscriptionHistory, 
  handleWebhook, 
  verifySession, 
  cancelSubscription,
  createPortalSession
} from '../controllers/subscription.controller';
import express from 'express';

const router = Router();

// Checkout Session (Precisa de autenticação)
router.post('/checkout', authenticate, createCheckoutSession);

// Cancelamento de Assinatura (Precisa de autenticação)
router.post('/cancel', authenticate, cancelSubscription);

// Portal do Cliente (Precisa de autenticação)
router.post('/portal', authenticate, createPortalSession);

// Histórico de Assinatura (Precisa de autenticação)
router.get('/history', authenticate, getSubscriptionHistory);

// Verificação de Sessão (Sucesso)
router.get('/verify/:sessionId', authenticate, verifySession);

export default router;
