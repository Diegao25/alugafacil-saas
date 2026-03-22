import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const MIN_LOGIN_COUNT_FOR_NPS = 5;

export const checkNpsStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { login_count: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const existing = await prisma.npsResponse.findFirst({
      where: { usuario_id: userId }
    });

    res.status(200).json({
      eligible: user.login_count >= MIN_LOGIN_COUNT_FOR_NPS && !existing,
      loginCount: user.login_count,
      submitted: Boolean(existing)
    });
  } catch (error) {
    console.error('Erro ao verificar NPS:', error);
    res.status(500).json({ error: 'Erro ao verificar o NPS' });
  }
};

export const submitNps = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { score, comment } = req.body;
    if (typeof score !== 'number' || score < 0 || score > 10) {
      res.status(400).json({ error: 'Nota inválida. Use um número entre 0 e 10.' });
      return;
    }

    if (comment && String(comment).length > 500) {
      res.status(400).json({ error: 'O comentário deve ter no máximo 500 caracteres.' });
      return;
    }

    const existing = await prisma.npsResponse.findFirst({
      where: { usuario_id: userId }
    });

    if (existing) {
      res.status(400).json({ error: 'Você já enviou o NPS anteriormente.' });
      return;
    }

    const nps = await prisma.npsResponse.create({
      data: {
        score,
        comment: comment ? String(comment).trim() : null,
        usuario_id: userId
      }
    });

    res.status(201).json(nps);
  } catch (error) {
    console.error('Erro ao salvar NPS:', error);
    res.status(500).json({ error: 'Erro ao enviar o NPS.' });
  }
};
