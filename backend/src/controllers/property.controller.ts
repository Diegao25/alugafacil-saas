import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../utils/owner';
import { Prisma } from '@prisma/client';
import { syncExternalCalendars } from '../services/calendar.service';

export const createProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nome, endereco, descricao, valor_diaria, capacidade_maxima, redes_sociais_url, foto_principal, comodidades, calendar_syncs } = req.body;
    const usuario_id = await resolveOwnerId(req.user?.id);
    if (!usuario_id) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    if (!nome || !endereco || !valor_diaria || !capacidade_maxima) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: usuario_id },
      select: { plan_name: true, subscription_status: true }
    });

    if (user?.subscription_status === 'trial_active') {
      // Trial users have unlimited properties during test period
    } else if (user?.plan_name === 'Plano Básico') {
      const propertyCount = await prisma.property.count({
        where: { usuario_id }
      });
      if (propertyCount >= 3) {
        res.status(403).json({ 
          error: 'Limite de imóveis atingido', 
          message: 'O Plano Básico permite o cadastro de até 3 imóveis. Faça o upgrade para o Plano Completo para cadastrar imóveis ilimitados.' 
        });
        return;
      }
    }

    const property = await prisma.property.create({
      data: {
        nome,
        endereco,
        descricao,
        valor_diaria: Number(valor_diaria),
        capacidade_maxima: Number(capacidade_maxima),
        redes_sociais_url,
        foto_principal,
        comodidades,
        usuario_id,
        calendar_syncs: calendar_syncs && Array.isArray(calendar_syncs) ? {
          create: calendar_syncs.map((sync: any) => ({
            provider: sync.provider,
            external_url: sync.external_url
          }))
        } : undefined
      },
      include: {
        calendar_syncs: true
      }
    });

    // Sincronizar calendários automaticamente após a criação (se houver links)
    if (calendar_syncs && Array.isArray(calendar_syncs) && calendar_syncs.length > 0) {
      await syncExternalCalendars(property.id);
    }

    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar imóvel', details: error });
  }
};

export const getProperties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario_id = await resolveOwnerId(req.user?.id);
    if (!usuario_id) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: usuario_id },
      select: { plan_name: true, subscription_status: true }
    });
    
    // Buscar todos ordenados pela data de criação (mais antigos primeiro para definir quem fica no limite)
    const allProperties = await prisma.property.findMany({
      where: { usuario_id },
      orderBy: { data_criacao: 'asc' }
    });

    const isBasic = user?.plan_name === 'Plano Básico' && user?.subscription_status !== 'trial_active';
    
    const propertiesWithFlag = allProperties.map((prop, index) => ({
      ...prop,
      is_excedente: isBasic && index >= 3
    }));

    // Retornar na ordem inversa (mais novos primeiro) para a UI
    res.json(propertiesWithFlag.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar imóveis' });
  }
};

export const getPropertyById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const usuario_id = await resolveOwnerId(req.user?.id);
    if (!usuario_id) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const property = await prisma.property.findFirst({
      where: { id, usuario_id },
      include: {
        calendar_syncs: true
      }
    });

    if (!property) {
      res.status(404).json({ error: 'Imóvel não encontrado' });
      return;
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar imóvel' });
  }
};

export const updateProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const usuario_id = await resolveOwnerId(req.user?.id);
    const data = req.body;
    if (!usuario_id) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    // Verificar se pertence ao user
    const property = await prisma.property.findFirst({ where: { id, usuario_id } });
    if (!property) {
      res.status(404).json({ error: 'Imóvel não encontrado ou não autorizado' });
      return;
    }

    // Converter numericos
    if (data.valor_diaria) data.valor_diaria = Number(data.valor_diaria);
    if (data.capacidade_maxima) data.capacidade_maxima = Number(data.capacidade_maxima);

    const { calendar_syncs, ...updateData } = data;

    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...updateData,
        calendar_syncs: calendar_syncs && Array.isArray(calendar_syncs) ? {
          deleteMany: {}, // Simplificação: remove todos e recria os novos (ou usa lógica de sync mais complexa se necessário)
          create: calendar_syncs.map((sync: any) => ({
            provider: sync.provider,
            external_url: sync.external_url
          }))
        } : undefined
      },
      include: {
        calendar_syncs: true
      }
    });

    // Sincronizar calendários automaticamente após a atualização (se houver links)
    if (calendar_syncs && Array.isArray(calendar_syncs) && calendar_syncs.length > 0) {
      await syncExternalCalendars(id);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar imóvel' });
  }
};

export const deleteProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const usuario_id = await resolveOwnerId(req.user?.id);
    if (!usuario_id) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const property = await prisma.property.findFirst({ where: { id, usuario_id } });
    if (!property) {
      res.status(404).json({ error: 'Imóvel não encontrado ou não autorizado' });
      return;
    }

    await prisma.property.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    const isP2003 = error.code === 'P2003' || 
                    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') ||
                    (error.message && (
                      error.message.includes('P2003') || 
                      error.message.includes('foreign key constraint') ||
                      error.message.includes('violação de chave estrangeira')
                    ));

    if (isP2003) {
      res.status(400).json({ 
        error: 'Não é possível excluir este imóvel pois ele possui reservas ou outros registros vinculados.' 
      });
      return;
    }
    
    console.error('DEBUG - Erro na exclusão (objeto completo):', error);
    if (error.code) console.error('DEBUG - Código detectado:', error.code);
    
    res.status(500).json({ error: 'Erro interno ao excluir imóvel' });
  }
};
