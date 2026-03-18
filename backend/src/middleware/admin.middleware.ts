import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth.middleware';

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { is_admin: true }
    });

    if (!user?.is_admin) {
      res.status(403).json({ error: 'Acesso restrito ao administrador' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar permissões' });
  }
};
