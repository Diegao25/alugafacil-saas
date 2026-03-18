import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// Mapeamento de planos para preços do Stripe (ID de Teste)
// Nota: Em um ambiente real, esses IDs viriam de variáveis de ambiente
const PLAN_PRICE_MAPPING: Record<string, string> = {
  'Essencial': 'price_1R1XXXXXXXXXXXX', // O usuário precisará criar estes preços no dashboard do Stripe
  'Profissional': 'price_1R2XXXXXXXXXXXX',
};

export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planName } = req.body;
    const userId = req.user?.id;

    console.log('--- Início de Checkout ---');
    console.log('User ID:', userId);
    console.log('Plan Name:', planName);

    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Criar ou recuperar cliente no Stripe
    let stripeCustomerId = (user as any).stripe_customer_id;
    console.log('Stripe Customer ID Atual:', stripeCustomerId);

    if (!stripeCustomerId) {
      console.log('Criando novo cliente no Stripe...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.nome,
        metadata: { userId: user.id }
      });
      stripeCustomerId = customer.id;
      console.log('Novo Stripe Customer ID:', stripeCustomerId);

      await prisma.user.update({
        where: { id: userId },
        data: { stripe_customer_id: stripeCustomerId } as any
      });
      console.log('Usuário atualizado com Stripe Customer ID no banco.');
    }

    // Definir o preço com base no plano (ou usar modo 'payment' se não for recorrente, mas SaaS costuma ser 'subscription')
    // Como não temos os IDs de preço reais, vamos usar um hack de criar um preço on-the-fly ou pedir ao usuário.
    // Para simplificar o teste inicial, usaremos um produto genérico se o ID não estiver mapeado.
    
    console.log('Criando sessão de checkout no Stripe...');
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'], // Pode adicionar 'pix' se a conta stripe-br permitir
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Plano ${planName} - Gestão de Locações`,
              description: `Assinatura mensal do plano ${planName}`,
            },
            unit_amount: planName === 'Essencial' ? 4900 : 9700,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard/plans/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/plans`,
      metadata: {
        userId: user.id,
        planName: planName
      }
    });

    console.log('Sessão criada:', session.id);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de checkout', message: error.message });
  }
};

export const cancelSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { motivo, detalhe, accepted_discount, accepted_downgrade } = req.body as {
      motivo?: string;
      detalhe?: string;
      accepted_discount?: boolean;
      accepted_downgrade?: boolean;
    };

    if (!motivo || typeof motivo !== 'string') {
      res.status(400).json({ error: 'Motivo do cancelamento é obrigatório.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const now = new Date();
    const accessUntil = new Date(now);
    accessUntil.setMonth(accessUntil.getMonth() + 1);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          cancellation_date: now,
          access_until: accessUntil,
          subscription_status: 'cancelled',
          plan_type: 'free'
        } as any
      }),
      prisma.subscriptionHistory.create({
        data: {
          plan_name: 'Cancelamento',
          amount: 0,
          usuario_id: userId
        } as any
      }),
      prisma.cancellationFeedback.create({
        data: {
          motivo,
          detalhe: detalhe || null,
          accepted_discount: !!accepted_discount,
          accepted_downgrade: !!accepted_downgrade,
          usuario_id: userId
        } as any
      })
    ]);

    res.json({
      success: true,
      access_until: accessUntil.toISOString()
    });
  } catch (error: any) {
    console.error('Cancel Subscription Error:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura', message: error.message });
  }
}

export const verifySession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    console.log('Verificando Sessão:', sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId as string, {
      expand: ['subscription', 'subscription.latest_invoice.payment_intent']
    });

    if (session.payment_status === 'paid') {
      const planName = session.metadata?.planName || 'Essencial';
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : (session.subscription as any).id;
      if (userId) {
        const existingUser = await prisma.user.findUnique({ where: { id: userId } });
        console.log('Verificação de pagamento concluída. Atualizando dados da assinatura...');
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan_type: planName.toLowerCase(),
            plan_name: planName,
            subscription_status: 'active_subscription',
            stripe_subscription_id: subscriptionId,
            trial_end_date: null,
            subscription_date: new Date(),
            subscription_amount: planName === 'Essencial' ? 49.00 : 97.00,
            payment_method: 'Cartão de Crédito' // Simplificado
          } as any
        });

        const planAmount = planName === 'Essencial' ? 49.00 : 97.00;
        if (existingUser?.subscription_status === 'cancelled') {
          await prisma.subscriptionHistory.create({
            data: {
              plan_name: 'Reativação',
              amount: planAmount,
              usuario_id: userId
            } as any
          });
        }
        await recordSubscriptionHistory(userId, planName, planAmount);
      }

      // Retornar detalhes para o frontend
      const subscription = session.subscription as any;
      const unitAmount = session.amount_total || 0;
      
      res.json({
        success: true,
        planName,
        date: new Date(session.created * 1000).toLocaleDateString('pt-BR'),
        amount: (unitAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        paymentMethod: 'Cartão de Crédito', // Simplificado para o teste
        status: 'Ativo'
      });
    } else {
      res.status(400).json({ error: 'Pagamento não concluído' });
    }
  } catch (error: any) {
    console.error('Verify Session Error:', error);
    // Escrever erro detalhado em um arquivo para o agente ler
    try {
      const fs = require('fs');
      const errorDetail = JSON.stringify({
        message: error.message,
        stack: error.stack,
        prisma: error.meta,
        code: error.code
      }, null, 2);
      fs.writeFileSync('c:/Users/Davi e Sarah/.gemini/antigravity/scratch/gestao_locacoes/backend/error_log.json', errorDetail);
    } catch (e) {}
    
    res.status(500).json({ error: 'Erro ao verificar sessão', message: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Lógica para processar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as any;
      const userId = session.metadata.userId;
      const planName = session.metadata.planName;
      const subscriptionId = session.subscription;

      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan_type: planName.toLowerCase(),
          plan_name: planName,
          subscription_status: 'active_subscription',
          stripe_subscription_id: subscriptionId,
          trial_end_date: null,
          subscription_date: new Date(),
          subscription_amount: planName === 'Essencial' ? 49.00 : 97.00,
          payment_method: 'Cartão de Crédito'
        } as any
      });

      const planAmount = planName === 'Essencial' ? 49.00 : 97.00;
      if (existingUser?.subscription_status === 'cancelled') {
        await prisma.subscriptionHistory.create({
          data: {
            plan_name: 'Reativação',
            amount: planAmount,
            usuario_id: userId
          } as any
        });
      }
      await recordSubscriptionHistory(userId, planName, planAmount);
      break;
    
    case 'customer.subscription.deleted':
      const subscription = event.data.object as any;
      await prisma.user.updateMany({
        where: { stripe_subscription_id: subscription.id } as any,
        data: { 
          subscription_status: 'cancelled',
          plan_type: 'free'
        } as any
      });
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

export const getSubscriptionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const history = await prisma.subscriptionHistory.findMany({
      where: { usuario_id: userId },
      orderBy: { date: 'desc' }
    });

    res.json(history);
  } catch (error: any) {
    console.error('Get History Error:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

// Helper para evitar duplicatas no histórico
async function recordSubscriptionHistory(userId: string, planName: string, amount: number) {
  const lastEntry = await prisma.subscriptionHistory.findFirst({
    where: { usuario_id: userId },
    orderBy: { date: 'desc' }
  });

  // Só cria se não houver histórico ou se o plano mudou
  if (!lastEntry || lastEntry.plan_name !== planName) {
    console.log(`Registrando mudança de plano para ${planName} no histórico.`);
    await prisma.subscriptionHistory.create({
      data: {
        plan_name: planName,
        amount: amount,
        usuario_id: userId
      }
    });
  } else {
    console.log(`Plano ${planName} já é o último registrado no histórico. Pulando.`);
  }
}
