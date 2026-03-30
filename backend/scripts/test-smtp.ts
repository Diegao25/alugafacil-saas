import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente do .env do backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { sendWelcomeEmail } from '../src/utils/mail';

async function testSMTP() {
  console.log('--- Iniciando Teste de SMTP (Umbler) ---');
  console.log('User:', process.env.SMTP_USER);
  console.log('Host:', process.env.SMTP_HOST);

  const testEmail = 'suporte@alugafacil.net.br'; // Enviando para si mesmo para teste
  const testName = 'Desenvolvedor Aluga Fácil';
  const loginLink = 'https://www.alugafacil.net.br/login';

  try {
    console.log(`Tentando enviar e-mail para ${testEmail}...`);
    const result = await sendWelcomeEmail(testEmail, testName, loginLink, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    console.log('Sucesso! E-mail enviado. ID da Mensagem:', (result as any).messageId);
    process.exit(0);
  } catch (error) {
    console.error('Erro no envio do e-mail de teste:', error);
    process.exit(1);
  }
}

testSMTP();
