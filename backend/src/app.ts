import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import propertyRoutes from './routes/property.routes';
import tenantRoutes from './routes/tenant.routes';
import reservationRoutes from './routes/reservation.routes';
import paymentRoutes from './routes/payment.routes';
import contractRoutes from './routes/contract.routes';
import dashboardRoutes from './routes/dashboard.routes';
import publicRoutes from './routes/public.routes';
import userRoutes from './routes/user.routes';
import subscriptionRoutes from './routes/subscription.routes';
import { campaignRoutes } from './routes/campaign.routes';
import npsRoutes from './routes/nps.routes';
import cesRoutes from './routes/ces.routes';
import { getAllowedOrigins, getJwtSecret, isOriginAllowed } from './utils/security';

const app = express();
const allowedOrigins = getAllowedOrigins();
getJwtSecret();

app.set('trust proxy', 1);

// Middleware de Log de Auditoria
app.use((req, res, next) => {
  const origin = req.headers.origin || 'No Origin';
  console.log(`[Request] ${req.method} ${req.url} | Origin: ${origin}`);
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    console.warn(`[CORS] Rejected Origin in Middleware: ${origin}`);
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));

// Webhook do Stripe (PRECISA vir antes do express.json() para ter acesso ao raw body)
import { handleWebhook } from './controllers/subscription.controller';
app.post('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/nps', npsRoutes);
app.use('/api/ces', cesRoutes);

export default app;
