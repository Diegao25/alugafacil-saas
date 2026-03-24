import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Verifica se o usuário é elegível para o CES de onboarding.
 * Elegibilidade: 
 * 1. Todos os 4 passos do onboarding concluídos
 * 2. Ainda não respondeu ao CES de onboarding
 */
export const checkCesStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    // 1. Verificar se já respondeu
    const existing = await prisma.cesResponse.findFirst({
      where: { 
        usuario_id: userId,
        task_type: 'onboarding'
      }
    });

    if (existing) {
      res.status(200).json({ eligible: false, message: 'Já respondeu ao CES' });
      return;
    }

    // 2. Verificar conclusão do onboarding
    // Buscamos as estatísticas básicas
    const [totalProperties, totalTenants, totalReservations, user] = await Promise.all([
      prisma.property.count({ where: { usuario_id: userId } }),
      prisma.tenant.count({ where: { usuario_id: userId } }),
      prisma.reservation.count({ where: { imovel: { usuario_id: userId } } }),
      prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { cpf_cnpj: true, telefone: true, endereco: true } 
      })
    ]);

    const profileCompleted = Boolean(user?.cpf_cnpj && user?.telefone && user?.endereco);
    const onboardingCompleted = totalProperties > 0 && totalTenants > 0 && totalReservations > 0 && profileCompleted;

    res.status(200).json({
      eligible: onboardingCompleted,
      stats: {
        totalProperties,
        totalTenants,
        totalReservations,
        profileCompleted
      }
    });
  } catch (error) {
    console.error('Erro ao verificar CES:', error);
    res.status(500).json({ error: 'Erro interno ao verificar CES' });
  }
};

/**
 * Registra uma nova resposta de CES
 */
export const submitCes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { score, comment, task_type = 'onboarding' } = req.body;

    if (typeof score !== 'number' || score < 1 || score > 7) {
      res.status(400).json({ error: 'Nota inválida. Use de 1 a 7.' });
      return;
    }

    if (comment && String(comment).length > 500) {
      res.status(400).json({ error: 'O comentário deve ter no máximo 500 caracteres.' });
      return;
    }

    const ces = await prisma.cesResponse.create({
      data: {
        score,
        comment: comment ? String(comment).trim() : null,
        task_type,
        usuario_id: userId
      }
    });

    res.status(201).json(ces);
  } catch (error) {
    console.error('Erro ao salvar CES:', error);
    res.status(500).json({ error: 'Erro ao processar seu feedback' });
  }
};
