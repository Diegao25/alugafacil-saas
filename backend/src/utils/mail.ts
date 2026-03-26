import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function getFromAddress() {
  return process.env.EMAIL_FROM || 'Aluga Fácil <onboarding@resend.dev>';
}

export async function sendPasswordResetEmail(email: string, nome: string, resetLink: string) {
  try {
    if (!resend) {
      console.warn('Resend não configurado. Link de recuperação:', resetLink);
      return;
    }
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: 'Recuperação de Senha - Aluga Fácil',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #2563eb; margin-bottom: 24px;">Aluga Fácil</h1>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Você solicitou a recuperação de senha da sua conta. Clique no botão abaixo para escolher uma nova senha:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Ou copie e cole o link no seu navegador:</p>
          <p style="color: #64748b; font-size: 14px; word-break: break-all;">
            <a href="${resetLink}" style="color: #2563eb; text-decoration: underline;">${resetLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Este link expira em 1 hora.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Falha crítica no envio de e-mail:', err);
    throw err;
  }
}

export async function sendWelcomeEmail(
  email: string,
  nome: string,
  loginLink: string,
  trialEndDate?: Date | null
) {
  const trialEndLabel = trialEndDate
    ? trialEndDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : null;

  try {
    if (!resend) {
      console.warn('Resend não configurado. E-mail de boas-vindas não enviado para:', email);
      return;
    }
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: 'Bem-vindo ao Aluga Fácil',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #2563eb; margin-bottom: 24px;">Aluga Fácil</h1>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Seu cadastro foi concluído com sucesso e sua conta já está pronta para uso.</p>
          <p>Você já pode acessar a plataforma para concluir seu perfil, aceitar os termos e começar a cadastrar seus imóveis e locatários.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Acessar minha conta
            </a>
          </div>
          ${trialEndLabel ? `<p style="color: #0f172a;"><strong>Seu período de teste vai até ${trialEndLabel}.</strong></p>` : ''}
          <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="color: #64748b; font-size: 14px; word-break: break-all;">
            <a href="${loginLink}" style="color: #2563eb; text-decoration: underline;">${loginLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Se você não reconhece este cadastro, ignore este e-mail.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail de boas-vindas via Resend:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Falha crítica no envio de e-mail de boas-vindas:', err);
    throw err;
  }
}

export async function sendInvitedUserWelcomeEmail(
  email: string,
  nome: string,
  setupPasswordLink: string
) {
  try {
    if (!resend) {
      console.warn('Resend não configurado. E-mail de convite não enviado para:', email);
      return;
    }
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: 'Defina sua senha de acesso ao Aluga Fácil',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #2563eb; margin-bottom: 24px;">Aluga Fácil</h1>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Um acesso para você foi criado no Aluga Fácil.</p>
          <p>Para concluir seu primeiro acesso, clique no botão abaixo e defina sua senha.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${setupPasswordLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Definir minha senha
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Este link pode ser usado uma única vez dentro do prazo de 1 hora.</p>
          <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="color: #64748b; font-size: 14px; word-break: break-all;">
            <a href="${setupPasswordLink}" style="color: #2563eb; text-decoration: underline;">${setupPasswordLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Se você não esperava este convite, entre em contato com quem administra a conta.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail para usuário convidado via Resend:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Falha crítica no envio de e-mail para usuário convidado:', err);
    throw err;
  }
}
export async function sendSubscriptionConfirmationEmail(
  email: string,
  nome: string,
  planName: string,
  amount: number,
  date: Date
) {
  const formattedAmount = (amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedDate = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    if (!resend) {
      console.warn('Resend não configurado. E-mail de confirmação de assinatura não enviado para:', email);
      return;
    }
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: `Assinatura Confirmada: ${planName} - Aluga Fácil`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #2563eb; margin-bottom: 24px;">Aluga Fácil</h1>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Parabéns! Sua assinatura do <strong>${planName}</strong> foi confirmada com sucesso.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #1e293b;">Detalhes da Assinatura</h3>
            <p style="margin: 8px 0;"><strong>Plano:</strong> ${planName}</p>
            <p style="margin: 8px 0;"><strong>Valor:</strong> ${formattedAmount}</p>
            <p style="margin: 8px 0;"><strong>Data:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> Ativo</p>
          </div>

          <p>Você agora tem acesso ilimitado a todas as ferramentas premium da plataforma.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Acessar Painel
            </a>
          </div>

          <p style="color: #64748b; font-size: 14px;">Dúvidas? Responda a este e-mail que nossa equipe te ajudará.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Aluga Fácil - Gestão Inteligente para Corretores e Proprietários</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail de confirmação via Resend:', error);
      throw new Error(error.message);
    }
    return data;
  } catch (err) {
    console.error('Falha crítica no envio de e-mail de confirmação:', err);
    throw err;
  }
}

export async function sendSubscriptionCancellationEmail(
  email: string,
  nome: string,
  planName: string,
  cancellationDate: Date,
  accessUntil: Date
) {
  const formattedCancellationDate = cancellationDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const formattedAccessUntil = accessUntil.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    if (!resend) {
      console.warn('Resend não configurado. E-mail de cancelamento não enviado para:', email);
      return;
    }
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: `Cancelamento de Assinatura - Aluga Fácil`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #ef4444; margin-bottom: 24px;">Aluga Fácil</h1>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Confirmamos a solicitação de cancelamento da sua assinatura do <strong>${planName}</strong> realizada em ${formattedCancellationDate}.</p>
          
          <div style="background-color: #fff1f2; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #fecaca;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Importante:</p>
            <p style="margin: 8px 0; color: #991b1b;">Você continuará tendo acesso a todas as funcionalidades premium até o dia <strong>${formattedAccessUntil}</strong>. Após essa data você perderá o acesso ao sistema.</p>
          </div>
          
          <p><strong>Mudou de ideia?</strong> Você pode reativar sua assinatura a qualquer momento diretamente no seu painel.</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/plans" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Ver Planos / Reativar
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Sentiremos sua falta! Se houver algo que possamos fazer por você, entre em contato.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail de cancelamento via Resend:', error);
      throw new Error(error.message);
    }
    return data;
  } catch (err) {
    console.error('Falha crítica no envio de e-mail de cancelamento:', err);
    throw err;
  }
}
