import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createCheckoutSession, getSubscriptionHistory, handleWebhook, verifySession, cancelSubscription } from '../controllers/subscription.controller';
import express from 'express';

const router = Router();

// Checkout Session (Precisa de autenticação)
router.post('/checkout', authenticate, createCheckoutSession);

// Cancelamento de Assinatura (Precisa de autenticação)
router.post('/cancel', authenticate, cancelSubscription);

// Histórico de Assinatura (Precisa de autenticação)
router.get('/history', authenticate, getSubscriptionHistory);

// Verificação de Sessão (Sucesso)
router.get('/verify/:sessionId', authenticate, verifySession);

// Webhook (Não pode ter authenticate e precisa de raw body)
// A rota real será /api/subscriptions/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
