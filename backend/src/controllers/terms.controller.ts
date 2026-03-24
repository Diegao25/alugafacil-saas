import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getOrCreateActiveTermsVersion, getRequestIpAddress } from '../utils/terms';
import { canManageUsers } from '../utils/owner';

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
    console.log(`[Terms] User ${userId} is accepting terms version ${activeTerms.id}`);
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = getRequestIpAddress(forwardedFor, req.ip);
    const userAgent = req.get('user-agent') || null;

    // Usando findFirst + create/update em vez de upsert para melhor rastreabilidade de erros
    let acceptance = await prisma.userTermsAcceptance.findFirst({
      where: {
        usuario_id: userId,
        terms_version_id: activeTerms.id
      }
    });

    if (acceptance) {
      console.log(`[Terms] Updating existing acceptance for user ${userId}`);
      acceptance = await prisma.userTermsAcceptance.update({
        where: { id: acceptance.id },
        data: {
          accepted_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent
        }
      });
    } else {
      console.log(`[Terms] Creating new acceptance for user ${userId}`);
      acceptance = await prisma.userTermsAcceptance.create({
        data: {
          usuario_id: userId,
          terms_version_id: activeTerms.id,
          ip_address: ipAddress,
          user_agent: userAgent
        }
      });
    }

    console.log(`[Terms] Acceptance recorded for user ${userId}. Status: SUCCESS`);

    res.status(200).json({
      message: 'Termos aceitos com sucesso.',
      version: activeTerms.version,
      accepted_at: acceptance.accepted_at
    });
  } catch (error) {
    console.error('[Terms] Error accepting terms:', error);
    res.status(500).json({ error: 'Erro ao registrar aceite dos termos.', details: error });
  }
};
