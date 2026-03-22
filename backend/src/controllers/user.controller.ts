import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../utils/owner';
import { PASSWORD_POLICY_MESSAGE, isStrongPassword } from '../utils/password';
import { sendInvitedUserWelcomeEmail } from '../utils/mail';

const PASSWORD_HASH_ROUNDS = 10;

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: ownerId },
          { owner_user_id: ownerId }
        ]
      },
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
    const { nome, email } = req.body;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!nome || !email) {
      res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
      return;
    }

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      res.status(400).json({ error: 'Este e-mail já está em uso.' });
      return;
    }

    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');
    const setupTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    const temporaryPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(temporaryPassword, PASSWORD_HASH_ROUNDS);

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: passwordHash,
        is_admin: false,
        owner_user_id: ownerId,
        reset_token: setupTokenHash,
        reset_token_expires: setupTokenExpires
      },
      select: {
        id: true,
        nome: true,
        email: true,
        data_criacao: true,
        is_admin: true
      }
    });

    const frontendBase = process.env.FRONTEND_URL || process.env.WEB_BASE_URL || 'http://localhost:3000';
    const setupPasswordLink = `${frontendBase}/reset-password?token=${setupToken}`;

    try {
      await sendInvitedUserWelcomeEmail(user.email, user.nome, setupPasswordLink);
    } catch (error) {
      console.warn('Falha no envio do e-mail para usuário convidado:', error);
    }

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário', details: error });
  }
};

export const resendInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        owner_user_id: ownerId
      },
      select: {
        id: true,
        nome: true,
        email: true,
        is_admin: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (user.is_admin) {
      res.status(400).json({ error: 'Convites só podem ser reenviados para usuários secundários.' });
      return;
    }

    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');
    const setupTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: setupTokenHash,
        reset_token_expires: setupTokenExpires
      }
    });

    const frontendBase = process.env.FRONTEND_URL || process.env.WEB_BASE_URL || 'http://localhost:3000';
    const setupPasswordLink = `${frontendBase}/reset-password?token=${setupToken}`;

    try {
      await sendInvitedUserWelcomeEmail(user.email, user.nome, setupPasswordLink);
    } catch (error) {
      console.warn('Falha no reenvio do e-mail para usuário convidado:', error);
      res.status(500).json({ error: 'Não foi possível reenviar o convite por e-mail.' });
      return;
    }

    res.status(200).json({ message: 'Convite reenviado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reenviar convite', details: error });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { nome, email, senha } = req.body;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        OR: [
          { id: ownerId },
          { owner_user_id: ownerId }
        ]
      },
      select: { id: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const data: { nome?: string; email?: string; senha?: string } = {};
    if (nome) data.nome = nome;
    if (email) data.email = email;
    if (senha) {
      if (!isStrongPassword(senha)) {
        res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
        return;
      }

      data.senha = await bcrypt.hash(senha, PASSWORD_HASH_ROUNDS);
    }

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
    const ownerId = await resolveOwnerId(requesterId);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    if (requesterId === id) {
      res.status(400).json({ error: 'Não é possível excluir o próprio usuário.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { is_admin: true, owner_user_id: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const belongsToOwner = id === ownerId || user.owner_user_id === ownerId;
    if (!belongsToOwner) {
      res.status(403).json({ error: 'Sem permissão para excluir este usuário.' });
      return;
    }

    if (user.is_admin) {
      const adminsCount = await prisma.user.count({
        where: {
          is_admin: true,
          OR: [
            { id: ownerId },
            { owner_user_id: ownerId }
          ]
        }
      });
      if (adminsCount <= 1) {
        res.status(400).json({ error: 'É necessário manter pelo menos um administrador.' });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      // Usuários secundários antigos podem ter aceito termos ou respondido NPS
      await tx.userTermsAcceptance.deleteMany({ where: { usuario_id: id } });
      await tx.npsResponse.deleteMany({ where: { usuario_id: id } });
      
      await tx.user.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro na deleção de usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário', details: error });
  }
};
