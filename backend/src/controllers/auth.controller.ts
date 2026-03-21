import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/mail';
import { resolveOwnerId } from '../utils/owner';
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getJwtSecret } from '../utils/security';
import { isValidCpfCnpj } from '../utils/document';

const PASSWORD_HASH_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Credenciais inválidas.';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      res.status(400).json({ error: 'Por favor, forneça nome, email e senha.' });
      return;
    }

    const UserExists = await prisma.user.findUnique({ where: { email } });

    if (UserExists) {
      res.status(400).json({ error: 'Este e-mail já está em uso.' });
      return;
    }

    const passwordHash = await bcrypt.hash(senha, PASSWORD_HASH_ROUNDS);
    const adminExists = await prisma.user.findFirst({ where: { is_admin: true } });
    
    // ConfiguraÃ§Ã£o do Trial (14 dias)
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + 14);

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: passwordHash,
        is_admin: !adminExists,
        plan_type: 'trial',
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate,
        subscription_status: 'trial_active'
      },
    });

    res.status(201).json({ 
      user: { 
        id: user.id, 
        nome: user.nome, 
        email: user.email, 
        is_admin: user.is_admin,
        plan_type: user.plan_type,
        trial_end_date: user.trial_end_date,
        subscription_status: user.subscription_status
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário', details: error });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, senha } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
      return;
    }

    const checkPassword = await bcrypt.compare(senha, user.senha);

    if (!checkPassword) {
      res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
      return;
    }

    let isAdmin = user.is_admin;
    if (!isAdmin) {
      const adminExists = await prisma.user.findFirst({ where: { is_admin: true } });
      if (!adminExists) {
        await prisma.user.update({ where: { id: user.id }, data: { is_admin: true } });
        isAdmin = true;
      }
    }

    let refreshedUser = user;
    try {
      refreshedUser = await prisma.user.update({
        where: { id: user.id },
        data: { login_count: { increment: 1 } }
      });
    } catch (loginCountError) {
      // Keep login working even if the database schema is behind the code.
      console.warn('Nao foi possivel atualizar login_count durante o login:', loginCountError);
    }

    const secret = getJwtSecret();
    const token = jwt.sign({ id: user.id }, secret, {
      expiresIn: '7d',
    });
    // Store the session token in a secure cookie so the browser sends it
    // automatically and client-side JavaScript cannot read it.
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    let trialEndDate = user.trial_end_date;

    // Auto-correção: Se o trial_end_date for nulo mas for um usuário trial
    if (user.plan_type === 'trial' && !trialEndDate) {
      trialEndDate = new Date(user.data_criacao);
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { trial_end_date: trialEndDate }
      });
    }

    res.status(200).json({ 
      user: { 
        id: refreshedUser.id, 
        nome: refreshedUser.nome, 
        email: refreshedUser.email, 
        cpf_cnpj: refreshedUser.cpf_cnpj, 
        telefone: refreshedUser.telefone, 
        endereco: refreshedUser.endereco, 
        is_admin: isAdmin,
        plan_type: refreshedUser.plan_type,
        trial_end_date: trialEndDate,
        subscription_status: refreshedUser.subscription_status,
        plan_name: (refreshedUser as any).plan_name,
        subscription_date: (refreshedUser as any).subscription_date,
        subscription_amount: (refreshedUser as any).subscription_amount,
        payment_method: (refreshedUser as any).payment_method,
        cancellation_date: (refreshedUser as any).cancellation_date,
        access_until: (refreshedUser as any).access_until,
        login_count: (refreshedUser as any).login_count ?? 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login', details: error });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf_cnpj: true,
        telefone: true,
        endereco: true,
        is_admin: true,
        plan_type: true,
        trial_end_date: true,
        subscription_status: true,
        plan_name: true,
        subscription_date: true,
        subscription_amount: true,
        payment_method: true,
        cancellation_date: true,
        access_until: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    let finalUser = { ...user };

    // Auto-correção: Se o trial_end_date for nulo mas for um usuário trial
    if (user.plan_type === 'trial' && !user.trial_end_date) {
      // Buscar data_criacao para o cálculo justo
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { data_criacao: true }
      });

      if (fullUser) {
        const trialEndDate = new Date(fullUser.data_criacao);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { trial_end_date: trialEndDate },
          select: {
            id: true,
            nome: true,
            email: true,
            cpf_cnpj: true,
            telefone: true,
            endereco: true,
            is_admin: true,
            plan_type: true,
            trial_end_date: true,
            subscription_status: true,
            plan_name: true,
            subscription_date: true,
            subscription_amount: true,
            payment_method: true,
            cancellation_date: true,
            access_until: true,
          }
        });
        finalUser = updated;
      }
    }

    res.status(200).json(finalUser);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil', details: error });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, cpf_cnpj, telefone, endereco } = req.body;
    const userId = (req as any).user.id;
    const targetUserId = await resolveOwnerId(userId);

    if (!targetUserId) {
      res.status(404).json({ error: 'Locador não encontrado.' });
      return;
    }

    if (!isValidCpfCnpj(cpf_cnpj)) {
      res.status(400).json({ error: 'CPF ou CNPJ inválido.' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        nome,
        cpf_cnpj,
        telefone,
        endereco,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf_cnpj: true,
        telefone: true,
        endereco: true,
        is_admin: true,
      }
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil', details: error });
  }
};

export const getOwnerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    let owner = await prisma.user.findFirst({
      where: { is_admin: true },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf_cnpj: true,
        telefone: true,
        endereco: true,
        is_admin: true,
        data_criacao: true
      },
      orderBy: { data_criacao: 'asc' }
    });

    if (!owner) {
      const fallback = await prisma.user.findFirst({
        orderBy: { data_criacao: 'asc' },
        select: {
          id: true,
          nome: true,
          email: true,
          cpf_cnpj: true,
          telefone: true,
          endereco: true,
          is_admin: true,
          data_criacao: true
        }
      });

      if (!fallback) {
        res.status(404).json({ error: 'Locador não encontrado.' });
        return;
      }

      const promoted = await prisma.user.update({
        where: { id: fallback.id },
        data: { is_admin: true },
        select: {
          id: true,
          nome: true,
          email: true,
          cpf_cnpj: true,
          telefone: true,
          endereco: true,
          is_admin: true,
          data_criacao: true
        }
      });

      owner = promoted;
    }

    res.status(200).json(owner);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil do locador', details: error });
  }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'E-mail Ã© obrigatÃ³rio.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(200).json({ message: 'Se o e-mail existir, enviaremos as instruÃ§Ãµes.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: tokenHash,
        reset_token_expires: expires
      }
    });

    const frontendBase = process.env.FRONTEND_URL || process.env.WEB_BASE_URL || 'http://localhost:3000';
    const resetLink = `${frontendBase}/reset-password?token=${token}`;

    // Envio real do e-mail de recuperação
    try {
      await sendPasswordResetEmail(user.email, user.nome, resetLink);
    } catch (error) {
      console.warn('Falha no envio de e-mail (possivelmente falta de API Key):', error);
      // Em desenvolvimento, se não houver API Key, o link ainda aparecerá nos logs do console para testes.
      console.log('--- RESET LINK (DEBUG) ---');
      console.log(resetLink);
    }

    res.status(200).json({
      message: 'Se o e-mail existir, enviaremos as instruções.',
      // resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined // Comentado para segurança real
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao solicitar recuperação de senha', details: error });
  }
};


export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      res.status(400).json({ error: 'Token e nova senha sÃ£o obrigatÃ³rios.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        reset_token: tokenHash,
        reset_token_expires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      res.status(400).json({ error: 'Token invÃ¡lido ou expirado.' });
      return;
    }

    const passwordHash = await bcrypt.hash(senha, PASSWORD_HASH_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        senha: passwordHash,
        reset_token: null,
        reset_token_expires: null
      }
    });

    res.status(200).json({ message: 'Senha atualizada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao redefinir senha', details: error });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  res.status(200).json({ message: 'Logout realizado com sucesso.' });
};
