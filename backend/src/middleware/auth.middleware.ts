import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { AUTH_COOKIE_NAME, getJwtSecret, parseCookieValue } from '../utils/security';

export interface AuthRequest extends Request {
  user?: { id: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  // Keep Bearer support during rollout, but prefer the HttpOnly cookie session.
  const cookieToken = parseCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
  const token = bearerToken || cookieToken;

  if (!token) {
    console.warn(`[Auth] No token provided for ${req.method} ${req.url}`);
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as { id: string };
    
    // Verificacao extra: o usuario ainda existe no banco? (Evita orphan sessions)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true }
    });

    if (!user) {
      console.warn(`[Auth] Orphan session detected for user ${decoded.id} on ${req.url}`);
      res.status(401).json({ error: 'Sessão inválida ou usuário removido.' });
      return;
    }

    console.log(`[Auth] User ${decoded.id} authenticated for ${req.url}`);
    req.user = { id: decoded.id };
    next();
  } catch (err: any) {
    console.error(`[Auth] Token invalid for ${req.url}:`, err.message);
    res.status(401).json({ error: 'Token inválido' });
    return;
  }
};
