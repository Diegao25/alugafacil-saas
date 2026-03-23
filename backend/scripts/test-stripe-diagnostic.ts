import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  typescript: true,
});

async function testStripe() {
  console.log('--- Testando Conexão Stripe ---');
  console.log('Secret Key (prefixo):', process.env.STRIPE_SECRET_KEY?.substring(0, 7));
  console.log('Price ID:', process.env.STRIPE_PRICE_ESSENTIAL);

  try {
    console.log('1. Testando criação de cliente...');
    const customer = await stripe.customers.create({
      email: 'test-reset@example.com',
      name: 'Teste Reset DB',
    });
    console.log('✅ Cliente criado:', customer.id);

    console.log('2. Testando criação de sessão de checkout (Plano Completo)...');
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Plano Completo',
              description: 'Acesso total ao sistema Aluga Fácil',
            },
            unit_amount: 4990,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });
    console.log('✅ Sessão de checkout criada:', session.id);
    console.log('URL:', session.url);

  } catch (error: any) {
    console.error('❌ ERRO NO STRIPE:');
    console.error('Mensagem:', error.message);
    if (error.raw) {
      console.error('Detalhes:', JSON.stringify(error.raw, null, 2));
    }
  }
}

testStripe();
