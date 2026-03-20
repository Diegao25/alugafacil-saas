import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ AVISO: STRIPE_SECRET_KEY não definida no .env. Pagamentos estarão desabilitados.');
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      typescript: true,
    })
  : null;
