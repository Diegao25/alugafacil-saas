import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getJwtSecret } from '../utils/security';
import { canManageUsers } from '../utils/owner';
import { getTermsStatus } from '../utils/terms';
import { sendWelcomeEmail } from '../utils/mail';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'Token do Google não fornecido.' });
      return;
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Falha ao verificar token do Google.' });
      return;
    }

    const { email: rawEmail, name, picture, sub: googleId } = payload;
    const email = rawEmail.toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email },
    });

    let isNewUser = false;

    if (!user) {
      // Registrar novo usuário via Google
      isNewUser = true;
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialStartDate.getDate() + 14);

      user = await prisma.user.create({
        data: {
          nome: name || 'Usuário Google',
          email,
          senha: '', // Senha vazia para usuários Google
          is_admin: true,
          plan_type: 'trial',
          trial_start_date: trialStartDate,
          trial_end_date: trialEndDate,
          subscription_status: 'trial_active',
        },
      });

      const frontendBase = process.env.FRONTEND_URL || process.env.WEB_BASE_URL || 'http://localhost:3000';
      const loginLink = `${frontendBase}/login?external=1`;

      try {
        await sendWelcomeEmail(user.email, user.nome, loginLink, user.trial_end_date!);
      } catch (error) {
        console.warn('Falha no envio do e-mail de boas-vindas:', error);
      }
    } else {
      // Atualizar dados do usuário se necessário (nome/foto) e contador de login
      try {
        const updateData: any = { login_count: { increment: 1 } };
        
        // Se o usuário não tem nome ou tem o nome padrão, atualiza com o do Google
        if ((!user.nome || user.nome === 'Usuário Google') && name) {
          updateData.nome = name;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });

        // Atualizar objeto user local para o response
        if (updateData.nome) {
          user.nome = updateData.nome;
        }
      } catch (e) {
        console.warn('Não foi possível atualizar dados do usuário:', e);
      }
    }

    // Gerar JWT do sistema
    const secret = getJwtSecret();
    const token = jwt.sign({ id: user.id }, secret, {
      expiresIn: '7d',
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    const canManageUsersAccess = await canManageUsers(user.id);
    const termsStatus = await getTermsStatus(user.id);

    res.status(200).json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        is_admin: user.is_admin,
        can_manage_users: canManageUsersAccess,
        plan_type: user.plan_type,
        trial_end_date: user.trial_end_date,
        subscription_status: user.subscription_status,
        terms_pending: termsStatus.termsPending,
        current_terms_version: termsStatus.currentTermsVersion,
        accepted_terms_version: termsStatus.acceptedTermsVersion
      },
      isNewUser
    });
  } catch (error) {
    console.error('Erro no Google Login:', error);
    res.status(500).json({ error: 'Erro na autenticação com Google', details: error });
  }
};
