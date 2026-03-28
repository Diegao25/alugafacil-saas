import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth.middleware';

/**
 * Middleware para restringir funcionalidades baseadas no plano do usuário.
 * @param allowedPlans Lista de planos que têm acesso à funcionalidade.
 */
export const requirePlan = (allowedPlans: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan_name: true, subscription_status: true }
      });

      if (!user) {
        res.status(401).json({ error: 'Usuário não encontrado' });
        return;
      }

      // Se o usuário estiver no período de teste ativo, ele tem acesso total (como o Plano Completo)
      if (user.subscription_status === 'trial_active') {
        return next();
      }

      // Se o plano do usuário não estiver na lista de permitidos, bloqueia
      const userPlan = user.plan_name || 'Free';
      
      if (!allowedPlans.includes(userPlan)) {
        res.status(403).json({ 
          error: 'Funcionalidade restrita', 
          message: `Esta funcionalidade está disponível apenas para usuários do ${allowedPlans.join(' ou ')}. Faça o upgrade do seu plano para continuar.` 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Erro no planMiddleware:', error);
      res.status(500).json({ error: 'Erro ao verificar permissões do plano' });
    }
  };
};
