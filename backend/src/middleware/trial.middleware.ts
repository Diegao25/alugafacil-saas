import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth.middleware';

export const checkTrial = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'NÃ£o autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan_type: true,
        trial_end_date: true,
        subscription_status: true,
        access_until: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
      return;
    }

    // Se o plano já for premium/ativo, libera
    if (user.subscription_status === 'active_subscription') {
      return next();
    }

    // Se o plano foi cancelado, mas o acesso ainda é válido, libera
    const accessUntil = (user as any).access_until;
    if (user.subscription_status === 'cancelled' && accessUntil && new Date() < new Date(accessUntil)) {
      return next();
    }

    // Verificar se o trial expirou
    const trialEndDate = user.trial_end_date;
    
    if (trialEndDate && new Date() > trialEndDate) {
      // Opcional: Atualizar status no banco se ainda nÃ£o estiver como expired
      if (user.subscription_status !== 'trial_expired') {
        await prisma.user.update({
          where: { id: userId },
          data: { subscription_status: 'trial_expired' }
        });
      }

      res.status(403).json({ 
        error: 'Trial expirado', 
        code: 'TRIAL_EXPIRED',
        message: 'Seu perÃodo de teste terminou. Escolha um plano para continuar.'
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar trial' });
  }
};
