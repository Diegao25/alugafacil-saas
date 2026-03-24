import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../utils/owner';
import { Prisma } from '@prisma/client';

export const createProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nome, endereco, descricao, valor_diaria, capacidade_maxima, redes_sociais_url } = req.body;
    const usuario_id = await resolveOwnerId(req.user?.id);
    if (!usuario_id) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    if (!nome || !endereco || !valor_diaria || !capacidade_maxima) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      return;
    }

    const property = await prisma.property.create({
      data: {
        nome,
        endereco,
        descricao,
        valor_diaria: Number(valor_diaria),
        capacidade_maxima: Number(capacidade_maxima),
        redes_sociais_url,
        usuario_id,
      },
    });

    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar imóvel', details: error });
  }
};

export const getProperties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Retorna todos os imóveis do usuário autenticado
    const usuario_id = await resolveOwnerId(req.user?.id);
    if (!usuario_id) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }
    
    const properties = await prisma.property.findMany({
      where: { usuario_id },
      orderBy: { data_criacao: 'desc' }
    });

    res.json(properties);
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
      where: { id, usuario_id }
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
      res.status(401).json({ error: 'NÃ£o autorizado' });
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

    const updated = await prisma.property.update({
      where: { id },
      data
    });

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
