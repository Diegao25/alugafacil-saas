import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../utils/owner';

class CampaignController {
  async index(req: AuthRequest, res: Response) {
    try {
      const ownerId = await resolveOwnerId(req.user?.id);

      if (!ownerId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const campaigns = await prisma.campaign.findMany({
        where: {
          imovel: {
            usuario_id: ownerId
          }
        },
        include: {
          imovel: {
            select: { nome: true }
          },
          locatario: {
            select: { nome: true }
          }
        },
        orderBy: {
          data_envio: 'desc'
        }
      });

      return res.json(campaigns);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar campanhas' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { imovel_id, locatario_id, mensagem } = req.body;
      const ownerId = await resolveOwnerId(req.user?.id);

      if (!ownerId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      if (!imovel_id || !locatario_id || !mensagem) {
        return res.status(400).json({ error: 'Dados insuficientes' });
      }

      const property = await prisma.property.findFirst({
        where: {
          id: imovel_id,
          usuario_id: ownerId
        },
        select: { id: true }
      });

      if (!property) {
        return res.status(404).json({ error: 'Imóvel não encontrado para esta conta' });
      }

      const tenant = await prisma.tenant.findFirst({
        where: {
          id: locatario_id,
          usuario_id: ownerId
        },
        select: { id: true }
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Locatário não encontrado para esta conta' });
      }

      const campaign = await prisma.campaign.create({
        data: {
          imovel_id,
          locatario_id,
          mensagem
        }
      });

      return res.status(201).json(campaign);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao registrar campanha' });
    }
  }
}

export default new CampaignController();
