import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSubscriptionConfirmationEmail, sendSubscriptionCancellationEmail } from '../utils/mail';

// Mapeamento de planos para preços do Stripe (ID de Teste)
// Nota: Em um ambiente real, esses IDs viriam de variáveis de ambiente
// Mapeamento de planos para preços do Stripe
const STRIPE_PRICE_ESSENTIAL = process.env.STRIPE_PRICE_ESSENTIAL;
const STRIPE_PRICE_PROFESSIONAL = process.env.STRIPE_PRICE_PROFESSIONAL;

const PLAN_PRICE_MAPPING: Record<string, string | undefined> = {
  'Plano Completo': STRIPE_PRICE_ESSENTIAL, // Usando a mesma env por enquanto
};

export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!stripe) {
    res.status(503).json({ error: 'Funcionalidade de pagamentos não configurada neste servidor.' });
    return;
  }

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
        data: { stripe_customer_id: stripeCustomerId }
      });
      console.log('Usuário atualizado com Stripe Customer ID no banco.');
    }

    // Definir o preço com base no plano (ou usar modo 'payment' se não for recorrente, mas SaaS costuma ser 'subscription')
    // Como não temos os IDs de preço reais, vamos usar um hack de criar um preço on-the-fly ou pedir ao usuário.
    // Para simplificar o teste inicial, usaremos um produto genérico se o ID não estiver mapeado.
    
    console.log('Criando sessão de checkout no Stripe...');
    const priceId = PLAN_PRICE_MAPPING[planName as string];
    const lineItem: any = {
      quantity: 1,
    };

    if (priceId) {
      lineItem.price = priceId;
    } else {
      lineItem.price_data = {
        currency: 'brl',
        product_data: {
          name: planName,
          description: 'Acesso total ao sistema Aluga Fácil',
        },
        unit_amount: 4990,
        recurring: { interval: 'month' },
      };
    }

    console.log('Criando sessão de checkout no Stripe com Line Item:', JSON.stringify(lineItem));
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
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
    console.error('=== Stripe Checkout Error ===');
    console.error('Message:', error.message);
    console.error('Type:', error.type);
    console.error('Code:', error.code);
    console.error('Param:', error.param);
    if (error.raw) console.error('Raw:', JSON.stringify(error.raw, null, 2));
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
        }
      }),
      prisma.subscriptionHistory.create({
        data: {
          plan_name: 'Cancelamento',
          amount: 0,
          usuario_id: userId
        }
      }),
      prisma.cancellationFeedback.create({
        data: {
          motivo,
          detalhe: detalhe || null,
          accepted_discount: !!accepted_discount,
          accepted_downgrade: !!accepted_downgrade,
          usuario_id: userId
        }
      })
    ]);
    
    // Enviar e-mail de cancelamento
    try {
      await sendSubscriptionCancellationEmail(
        user.email,
        user.nome,
        user.plan_name || 'Plano Completo',
        now,
        accessUntil
      );
    } catch (e) {
      console.error('Erro ao enviar e-mail de cancelamento (manual):', e);
    }

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
  if (!stripe) {
    res.status(503).json({ error: 'Stripe não configurado' });
    return;
  }
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
            plan_type: 'pro',
            plan_name: planName,
            subscription_status: 'active_subscription',
            stripe_subscription_id: subscriptionId,
            trial_end_date: null,
            subscription_date: new Date(),
            subscription_amount: 49.90,
            payment_method: 'Cartão de Crédito' // Simplificado
          }
        });

        const planAmount = 49.90;
        if (existingUser?.subscription_status === 'cancelled') {
          await prisma.subscriptionHistory.create({
            data: {
              plan_name: 'Reativação',
              amount: planAmount,
              usuario_id: userId
            } as any
          });
        }
        await recordSubscriptionHistory(userId, planName, planAmount, existingUser);
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
    console.error('Verify Session Error:', {
      message: error.message,
      stack: error.stack,
      prisma: error.meta,
      code: error.code
    });
    
    res.status(500).json({ error: 'Erro ao verificar sessão', message: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!stripe) {
    res.status(503).json({ error: 'Webhook não configurado' });
    return;
  }
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
          plan_type: 'pro',
          plan_name: planName,
          subscription_status: 'active_subscription',
          stripe_subscription_id: subscriptionId,
          trial_end_date: null,
          subscription_date: new Date(),
          subscription_amount: 49.90,
          payment_method: 'Cartão de Crédito'
        }
      });

      const planAmount = 49.90;
      if (existingUser?.subscription_status === 'cancelled') {
        await prisma.subscriptionHistory.create({
          data: {
            plan_name: 'Reativação',
            amount: planAmount,
            usuario_id: userId
          }
        });
      }
      await recordSubscriptionHistory(userId, planName, planAmount, existingUser);
      break;
    
    case 'invoice.paid': {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription;
      
      if (subscriptionId) {
        // Atualiza a data de acesso toda vez que uma fatura é paga
        await prisma.user.updateMany({
          where: { stripe_subscription_id: subscriptionId } as any,
          data: {
            subscription_status: 'active_subscription',
            last_payment_date: new Date(),
          } as any
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        // Marca o usuário com problema de pagamento para que o front mostre um aviso
        await prisma.user.updateMany({
          where: { stripe_subscription_id: subscriptionId } as any,
          data: {
            subscription_status: 'payment_failed'
          } as any
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      await prisma.user.updateMany({
        where: { stripe_subscription_id: subscription.id } as any,
        data: { 
          subscription_status: 'cancelled',
          plan_type: 'free'
        } as any
      });

      // Se conseguirmos encontrar o usuário pelo subscriptionId, enviamos o e-mail
      const userToNotify = await prisma.user.findFirst({
        where: { stripe_subscription_id: subscription.id } as any
      });

      if (userToNotify && userToNotify.subscription_status !== 'cancelled') {
        try {
          await sendSubscriptionCancellationEmail(
            userToNotify.email,
            userToNotify.nome,
            userToNotify.plan_name || 'Plano Completo',
            new Date(),
            userToNotify.access_until || new Date()
          );
        } catch (e) {
          console.error('Erro ao enviar e-mail de cancelamento (webhook):', e);
        }
      }
      break;
    }

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

// Helper para evitar duplicatas no histórico e no envio de e-mails
async function recordSubscriptionHistory(userId: string, planName: string, amount: number, user?: any) {
  const lastEntry = await prisma.subscriptionHistory.findFirst({
    where: { usuario_id: userId },
    orderBy: { date: 'desc' }
  });

  // Só cria se não houver histórico ou se o plano mudou (evita duplicatas disparadas por webhooks+redirects)
  if (!lastEntry || lastEntry.plan_name !== planName) {
    console.log(`Registrando mudança de plano para ${planName} no histórico para o usuário ${userId}.`);
    await prisma.subscriptionHistory.create({
      data: {
        plan_name: planName,
        amount: amount,
        usuario_id: userId
      }
    });

    // Enviar e-mail de confirmação se for uma contratação ou reativação
    if (planName !== 'Cancelamento' && user) {
      try {
        console.log(`Enviando e-mail de confirmação única para ${user.email} (Plano: ${planName})`);
        await sendSubscriptionConfirmationEmail(
          user.email,
          user.nome,
          planName,
          amount,
          new Date()
        );
      } catch (e) {
        console.error('Erro ao enviar e-mail de confirmação centralizado:', e);
      }
    }
  } else {
    console.log(`Plano ${planName} já é o último registrado para o usuário ${userId}. Pulando histórico e e-mail.`);
  }
}
