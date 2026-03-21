import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { canManageUsers } from '../utils/owner';

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

    if (!(await canManageUsers(userId))) {
      res.status(403).json({ error: 'Acesso restrito ao locador responsável' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar permissões' });
  }
};
