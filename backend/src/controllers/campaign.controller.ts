import { Request, Response } from 'express';
import { prisma } from '../prisma';

class CampaignController {
  async index(req: Request, res: Response) {
    try {
      const campaigns = await prisma.campaign.findMany({
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

  async create(req: Request, res: Response) {
    try {
      const { imovel_id, locatario_id, mensagem } = req.body;

      if (!imovel_id || !locatario_id || !mensagem) {
        return res.status(400).json({ error: 'Dados insuficientes' });
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
