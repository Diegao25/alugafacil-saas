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
    console.log('--- Google Login Request ---');
    console.log('Credential provided:', !!credential);
    console.log('Google Client ID (env):', process.env.GOOGLE_CLIENT_ID);

    if (!credential) {
      res.status(400).json({ error: 'Token do Google não fornecido.' });
      return;
    }

    console.log('[Step 1] Verifying Google token...');
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log('[Step 2] Token verified. Payload extracted.');
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      console.error('[Error] Google payload mismatch or missing email');
      res.status(400).json({ error: 'Falha ao verificar token do Google.' });
      return;
    }

    const { email, name, picture, sub: googleId } = payload;
    console.log(`[Step 3] Searching user: ${email}`);

    let user = await prisma.user.findUnique({
      where: { email },
    });

    let isNewUser = false;

    if (!user) {
      console.log('[Step 4] New user detected. Creating account...');
      isNewUser = true;
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialStartDate.getDate() + 14);

      user = await prisma.user.create({
        data: {
          nome: name || 'Usuário Google',
          email,
          senha: '', 
          is_admin: true,
          plan_type: 'trial',
          trial_start_date: trialStartDate,
          trial_end_date: trialEndDate,
          subscription_status: 'trial_active',
          cpf_cnpj: '',
          telefone: '',
          endereco: '',
          login_count: 1
        },
      });
      console.log('[Step 4] User created successfully.');

      const frontendBase = process.env.FRONTEND_URL || process.env.WEB_BASE_URL || 'http://localhost:3000';
      const loginLink = `${frontendBase}/login?external=1`;

      try {
        await sendWelcomeEmail(user.email, user.nome, loginLink, user.trial_end_date!);
      } catch (error) {
        console.warn('Falha no envio do e-mail de boas-vindas:', error);
      }
    } else {
      console.log('[Step 4] Returning user. Updating login count...');
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { login_count: { increment: 1 } }
        });
      } catch (e) {
        console.warn('Não foi possível atualizar login_count:', e);
      }
    }

    console.log('[Step 5] Generating system JWT...');
    const secret = getJwtSecret();
    const token = jwt.sign({ id: user.id }, secret, {
      expiresIn: '7d',
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    console.log('[Step 6] Finalizing response data...');
    const canManageUsersAccess = await canManageUsers(user.id);
    const termsStatus = await getTermsStatus(user.id);

    console.log('[Step 7] Success! Sending user data.');
    res.status(200).json({
      token,
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
  } catch (error: any) {
    console.error('Erro detalhado no Google Login:', error);
    res.status(500).json({ 
      error: 'Erro na autenticação com Google', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
};
