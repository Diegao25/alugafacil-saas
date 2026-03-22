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
import { getAllowedOrigins, getJwtSecret } from './utils/security';

const app = express();
const allowedOrigins = getAllowedOrigins();
getJwtSecret();

app.set('trust proxy', 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

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

const PORT = process.env.PORT || 3333;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('SERVER ERROR EVENT:', error);
});

server.on('close', () => {
  console.log('SERVER CLOSE EVENT');
});

// Heartbeat para manter o loop de eventos ativo e debug
setInterval(() => {
  if (process.env.NODE_ENV !== 'production') {
    // console.log('Backend heartbeat...');
  }
}, 10000);
