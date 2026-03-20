import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, nome: string, resetLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Aluga Fácil <onboarding@resend.dev>', // Verifique no Resend se o seu domínio já está verificado
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
          <p style="color: #64748b; font-size: 14px; word-break: break-all;">${resetLink}</p>
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
