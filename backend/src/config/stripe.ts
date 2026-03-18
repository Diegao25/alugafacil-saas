import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in .env');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  typescript: true,
});
