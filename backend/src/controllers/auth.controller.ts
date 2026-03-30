import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/mail';
import { canManageUsers, resolveOwnerId } from '../utils/owner';
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getJwtSecret } from '../utils/security';
import { isValidCpfCnpj } from '../utils/document';
import { isValidPhone } from '../utils/phone';
import { getTermsStatus } from '../utils/terms';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/password';
import { AuthRequest } from '../middleware/auth.middleware';

const PASSWORD_HASH_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Credenciais inválidas.';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      res.status(400).json({ error: 'Por favor, forneça nome, email e senha.' });
      return;
    }

    if (!isStrongPassword(senha)) {
      res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
      return;
    }

    const UserExists = await prisma.user.findUnique({ where: { email } });

    if (UserExists) {
      res.status(400).json({ error: 'Este e-mail já está em uso.' });
      return;
    }

    const passwordHash = await bcrypt.hash(senha, PASSWORD_HASH_ROUNDS);
    
    // Configuração do Trial (14 dias)
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + 14);

    const user = (await prisma.user.create({
      data: {
        nome,
        email,
        senha: passwordHash,
        is_admin: true,
        owner_user_id: null,
        plan_type: 'trial',
        plan_name: 'Experimental',
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate,
        subscription_status: 'trial_active'
      },
    })) as any;

    const frontendBase = process.env.FRONTEND_URL || 'https://www.alugafacil.net.br';
    const loginLink = `${frontendBase}/login?external=1`;

    try {
      await sendWelcomeEmail(user.email, user.nome, loginLink, user.trial_end_date);
    } catch (error) {
      console.warn('Falha no envio do e-mail de boas-vindas:', error);
    }

    res.status(201).json({ 
      user: { 
        id: user.id, 
        nome: user.nome, 
        email: user.email, 
        is_admin: user.is_admin,
        can_manage_users: user.is_admin,
        plan_type: user.plan_type,
        trial_end_date: user.trial_end_date,
        subscription_status: user.subscription_status,
        has_seen_tour: (user as any).has_seen_tour,
        terms_pending: true,
        current_terms_version: null,
        accepted_terms_version: null
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

    const isAdmin = user.is_admin;

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
    const canManageUsersAccess = await canManageUsers(user.id);
    const termsStatus = await getTermsStatus(user.id);


    res.status(200).json({ 
      token,
      user: { 
        id: (refreshedUser as any).id, 
        nome: (refreshedUser as any).nome, 
        email: (refreshedUser as any).email, 
        cpf_cnpj: (refreshedUser as any).cpf_cnpj, 
        telefone: (refreshedUser as any).telefone, 
        endereco: (refreshedUser as any).endereco, 
        is_admin: isAdmin,
        can_manage_users: canManageUsersAccess,
        plan_type: (refreshedUser as any).plan_type,
        trial_end_date: trialEndDate,
        subscription_status: (refreshedUser as any).subscription_status,
        has_seen_tour: (refreshedUser as any).has_seen_tour,
        terms_pending: termsStatus.termsPending,
        current_terms_version: termsStatus.currentTermsVersion,
        accepted_terms_version: termsStatus.acceptedTermsVersion,
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
    const user = (await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf_cnpj: true,
        telefone: true,
        endereco: true,
        owner_user_id: true,
        is_admin: true,
        plan_type: true,
        trial_end_date: true,
        subscription_status: true,
        has_seen_tour: true,
        plan_name: true,
        subscription_date: true,
        subscription_amount: true,
        payment_method: true,
        cancellation_date: true,
        access_until: true,
      } as any
    })) as any;

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    let finalUser = { ...user };


    const canManageUsersAccess = await canManageUsers(user.id);
    const termsStatus = await getTermsStatus(user.id);

    res.status(200).json({
      ...finalUser,
      can_manage_users: canManageUsersAccess,
      terms_pending: termsStatus.termsPending,
      current_terms_version: termsStatus.currentTermsVersion,
      accepted_terms_version: termsStatus.acceptedTermsVersion
    });
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

    if (!(await canManageUsers(userId))) {
      res.status(403).json({ error: 'Somente o locador principal pode editar este perfil.' });
      return;
    }

    if (!cpf_cnpj || !String(cpf_cnpj).trim()) {
      res.status(400).json({ error: 'CPF ou CNPJ é obrigatório.' });
      return;
    }

    if (!isValidCpfCnpj(cpf_cnpj)) {
      res.status(400).json({ error: 'CPF ou CNPJ inválido.' });
      return;
    }

    if (telefone && !isValidPhone(telefone)) {
      res.status(400).json({ error: 'Telefone inválido. Deve conter 10 ou 11 dígitos com DDD.' });
      return;
    }

    // Verifica se já existe outra conta usando este CPF/CNPJ
    const existingUser = await prisma.user.findFirst({
      where: {
        cpf_cnpj,
        id: { not: targetUserId }
      }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Este CPF/CNPJ já está cadastrado em outra conta no sistema.' });
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
    const ownerId = await resolveOwnerId((req as any).user?.id);

    if (!ownerId) {
      res.status(404).json({ error: 'Locador não encontrado.' });
      return;
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
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

    if (!owner) {
      res.status(404).json({ error: 'Locador não encontrado.' });
      return;
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
      res.status(400).json({ error: 'E-mail é obrigatório.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(200).json({ message: 'Se o e-mail existir, enviaremos as instruções.' });
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

    const frontendBase = process.env.FRONTEND_URL || 'https://www.alugafacil.net.br';
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
      res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
      return;
    }

    if (!isStrongPassword(senha)) {
      res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
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
      res.status(400).json({ error: 'O link de recuperação expirou ou é inválido.' });
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

export const completeTour = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    await (prisma.user as any).update({
      where: { id: userId },
      data: { has_seen_tour: true }
    });

    res.status(200).json({ message: 'Tour concluído com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao concluir tour', details: error });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  res.status(200).json({ message: 'Logout realizado com sucesso.' });
};
