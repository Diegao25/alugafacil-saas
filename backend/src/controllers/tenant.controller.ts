import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nome, cpf, telefone, email, endereco, observacoes } = req.body;

    if (!nome) {
      res.status(400).json({ error: 'O nome é obrigatório' });
      return;
    }

    const tenant = await prisma.tenant.create({
      data: {
        nome,
        cpf,
        telefone,
        email,
        endereco,
        observacoes,
      },
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error('Erro ao criar locatário:', error);
    
    // Verificar se é erro de duplicação
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      if (error.message.includes('cpf')) {
        res.status(400).json({ error: 'CPF já cadastrado' });
        return;
      }
      if (error.message.includes('email')) {
        res.status(400).json({ error: 'E-mail já cadastrado' });
        return;
      }
    }
    
    res.status(500).json({ error: 'Erro ao criar locatário' });
  }
};

export const getTenants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { nome: 'asc' }
    });

    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar locatários' });
  }
};

export const getTenantById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({ error: 'Locatário não encontrado' });
      return;
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar locatário' });
  }
};

export const updateTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    // Verificar se existe
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      res.status(404).json({ error: 'Locatário não encontrado' });
      return;
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar locatário' });
  }
};

export const deleteTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      res.status(404).json({ error: 'Locatário não encontrado' });
      return;
    }

    const linkedReservations = await prisma.reservation.count({
      where: { locatario_id: id }
    });
    if (linkedReservations > 0) {
      res.status(409).json({
        error: 'Não é possível excluir o locatário porque há reservas vinculadas.'
      });
      return;
    }

    await prisma.tenant.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir locatário' });
  }
};
