import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Redirecionar logs para arquivo para facilitar depuração remota
const logFile = path.join(__dirname, '../debug.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
console.log = (...args) => {
  logStream.write(`[LOG] ${args.join(' ')}\n`);
  process.stdout.write(`${args.join(' ')}\n`);
};
console.error = (...args) => {
  logStream.write(`[ERR] ${args.join(' ')}\n`);
  process.stderr.write(`${args.join(' ')}\n`);
};
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

console.log('--- Startup Config ---');
console.log('GOOGLE_CLIENT_ID loaded:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET loaded:', !!process.env.GOOGLE_CLIENT_SECRET);

app.set('trust proxy', 1);

// Middleware de Log de Auditoria (Essencial para depuração de CORS em produção)
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

import { syncAllProperties } from './services/calendar.service';

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  
  // Configura a sincronização automática (Cron Job) a cada 1 hora
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    syncAllProperties().catch(err => console.error('[Cron] Erro na sincronização automática:', err));
  }, ONE_HOUR);

  // Executa uma sincronização inicial após 1 minuto de startup para garantir dados frescos
  setTimeout(() => {
    syncAllProperties().catch(err => console.error('[Cron] Erro na sincronização inicial:', err));
  }, 60 * 1000);
});
