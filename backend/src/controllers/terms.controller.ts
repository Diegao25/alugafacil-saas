import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getOrCreateActiveTermsVersion, getRequestIpAddress } from '../utils/terms';

export const getCurrentTerms = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id as string | undefined;

    if (!userId) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const activeTerms = await getOrCreateActiveTermsVersion();
    const acceptance = await prisma.userTermsAcceptance.findFirst({
      where: {
        usuario_id: userId,
        terms_version_id: activeTerms.id
      },
      select: {
        accepted_at: true
      },
      orderBy: { accepted_at: 'desc' }
    });

    res.status(200).json({
      id: activeTerms.id,
      version: activeTerms.version,
      title: activeTerms.title,
      content: activeTerms.content,
      published_at: activeTerms.published_at,
      accepted_at: acceptance?.accepted_at ?? null,
      terms_pending: !acceptance
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar os termos de uso.', details: error });
  }
};

export const acceptCurrentTerms = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id as string | undefined;

    if (!userId) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const activeTerms = await getOrCreateActiveTermsVersion();
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = getRequestIpAddress(forwardedFor, req.ip);
    const userAgent = req.get('user-agent') || null;

    const acceptance = await prisma.userTermsAcceptance.upsert({
      where: {
        usuario_id_terms_version_id: {
          usuario_id: userId,
          terms_version_id: activeTerms.id
        }
      },
      update: {
        accepted_at: new Date(),
        ip_address: ipAddress,
        user_agent: userAgent
      },
      create: {
        usuario_id: userId,
        terms_version_id: activeTerms.id,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });

    res.status(200).json({
      message: 'Termos aceitos com sucesso.',
      version: activeTerms.version,
      accepted_at: acceptance.accepted_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar aceite dos termos.', details: error });
  }
};
