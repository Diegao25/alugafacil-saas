import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        cpf_cnpj: true,
        telefone: true,
        endereco: true,
        data_criacao: true,
        is_admin: true
      },
      orderBy: { data_criacao: 'desc' }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
      return;
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      res.status(400).json({ error: 'Este e-mail já está em uso.' });
      return;
    }

    const passwordHash = await bcrypt.hash(senha, 8);
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: passwordHash,
        is_admin: false
      },
      select: {
        id: true,
        nome: true,
        email: true,
        data_criacao: true,
        is_admin: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário', details: error });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { nome, email, senha } = req.body;

    const data: { nome?: string; email?: string; senha?: string } = {};
    if (nome) data.nome = nome;
    if (email) data.email = email;
    if (senha) data.senha = await bcrypt.hash(senha, 8);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        data_criacao: true,
        is_admin: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário', details: error });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const requesterId = req.user?.id;

    if (requesterId === id) {
      res.status(400).json({ error: 'Não é possível excluir o próprio usuário.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { is_admin: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (user.is_admin) {
      const adminsCount = await prisma.user.count({ where: { is_admin: true } });
      if (adminsCount <= 1) {
        res.status(400).json({ error: 'É necessário manter pelo menos um administrador.' });
        return;
      }
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário', details: error });
  }
};
