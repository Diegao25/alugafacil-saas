import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import crypto from 'crypto';

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

    const passwordHash = await bcrypt.hash(senha, 8);
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

    const secret = process.env.JWT_SECRET || 'gestao_locacoes_secret';
    const token = jwt.sign({ id: user.id }, secret, {
      expiresIn: '7d',
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
      }, 
      token 
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
      res.status(400).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const checkPassword = await bcrypt.compare(senha, user.senha);

    if (!checkPassword) {
      res.status(401).json({ error: 'Senha incorreta.' });
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

    const secret = process.env.JWT_SECRET || 'gestao_locacoes_secret';
    const token = jwt.sign({ id: user.id }, secret, {
      expiresIn: '7d',
    });

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
        id: user.id, 
        nome: user.nome, 
        email: user.email, 
        cpf_cnpj: user.cpf_cnpj, 
        telefone: user.telefone, 
        endereco: user.endereco, 
        is_admin: isAdmin,
        plan_type: user.plan_type,
        trial_end_date: trialEndDate,
        subscription_status: user.subscription_status,
        plan_name: (user as any).plan_name,
        subscription_date: (user as any).subscription_date,
        subscription_amount: (user as any).subscription_amount,
        payment_method: (user as any).payment_method,
        cancellation_date: (user as any).cancellation_date,
        access_until: (user as any).access_until,
      }, 
      token 
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

    const user = await prisma.user.update({
      where: { id: userId },
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

    res.status(200).json({
      message: 'Se o e-mail existir, enviaremos as instruÃ§Ãµes.',
      resetLink
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao solicitar recuperaÃ§Ã£o de senha', details: error });
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

    const passwordHash = await bcrypt.hash(senha, 8);

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
