import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { isValidCpfCnpj } from '../utils/document';
import { isValidPhone } from '../utils/phone';
import { resolveOwnerId } from '../utils/owner';
import { Prisma } from '@prisma/client';

export const createTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nome, cpf, telefone, email, endereco, observacoes } = req.body;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    if (!nome) {
      res.status(400).json({ error: 'O nome é obrigatório' });
      return;
    }

    if (!cpf || !String(cpf).trim()) {
      res.status(400).json({ error: 'CPF ou CNPJ é obrigatório.' });
      return;
    }

    if (!isValidCpfCnpj(cpf)) {
      res.status(400).json({ error: 'CPF ou CNPJ inválido.' });
      return;
    }

    if (telefone && !isValidPhone(telefone)) {
      res.status(400).json({ error: 'Telefone inválido. Deve conter 10 ou 11 dígitos com DDD.' });
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
        usuario_id: ownerId
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
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    const tenants = await prisma.tenant.findMany({
      where: { usuario_id: ownerId },
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
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id, usuario_id: ownerId }
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
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    if (!data.cpf || !String(data.cpf).trim()) {
      res.status(400).json({ error: 'CPF ou CNPJ é obrigatório.' });
      return;
    }

    if (!isValidCpfCnpj(data.cpf)) {
      res.status(400).json({ error: 'CPF ou CNPJ inválido.' });
      return;
    }

    if (data.telefone && !isValidPhone(data.telefone)) {
      res.status(400).json({ error: 'Telefone inválido. Deve conter 10 ou 11 dígitos com DDD.' });
      return;
    }

    // Verificar se existe
    const tenant = await prisma.tenant.findFirst({ where: { id, usuario_id: ownerId } });
    if (!tenant) {
      res.status(404).json({ error: 'Locatário não encontrado' });
      return;
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...data,
        usuario_id: ownerId
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar locatário' });
  }
};

export const deleteTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    const tenant = await prisma.tenant.findFirst({ where: { id, usuario_id: ownerId } });
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
  } catch (error: any) {
    if (error.code === 'P2003' || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003')) {
      res.status(400).json({ 
        error: 'Não é possível excluir este locatário pois ele possui reservas ou outros registros vinculados.' 
      });
      return;
    }
    console.error('DEBUG - Erro ao excluir locatário:', error);
    res.status(500).json({ error: 'Erro interno ao excluir locatário' });
  }
};
