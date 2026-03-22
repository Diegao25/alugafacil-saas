import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function getFromAddress() {
  return process.env.EMAIL_FROM || 'Aluga Fácil <onboarding@resend.dev>';
}

export async function sendPasswordResetEmail(email: string, nome: string, resetLink: string) {
  try {
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
