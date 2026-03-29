import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app';
import { AUTH_HEADER, generateTestToken, generateExpiredToken } from './helpers/jwt.helper';
import { makeUser } from './helpers/factories';

jest.mock('../prisma');
jest.mock('../utils/mail', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../utils/terms', () => ({
  getTermsStatus: jest.fn().mockResolvedValue({
    termsPending: false,
    currentTermsVersion: null,
    acceptedTermsVersion: null,
  }),
}));

const { prisma } = require('../prisma');
const { getTermsStatus } = require('../utils/terms');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/mail');

const USER_ID = 'user-test-123';

beforeEach(() => {
  // Re-apply module mock implementations that resetMocks clears between tests
  getTermsStatus.mockResolvedValue({
    termsPending: false,
    currentTermsVersion: null,
    acceptedTermsVersion: null,
  });
  sendWelcomeEmail.mockResolvedValue(undefined);
  sendPasswordResetEmail.mockResolvedValue(undefined);
});

function mockAuthenticatedUser(userId = USER_ID) {
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const user = makeUser({ id: userId });

  prisma.user.findUnique
    .mockResolvedValueOnce({ id: userId }) // authenticate middleware
    .mockResolvedValueOnce({               // getMe query
      id: userId,
      nome: user.nome,
      email: user.email,
      cpf_cnpj: null,
      telefone: null,
      endereco: null,
      owner_user_id: null,
      is_admin: true,
      plan_type: 'trial',
      trial_end_date: futureDate,
      subscription_status: 'trial_active',
      has_seen_tour: false,
      plan_name: null,
      subscription_date: null,
      subscription_amount: null,
      payment_method: null,
      cancellation_date: null,
      access_until: null,
    });

  prisma.user.findUnique
    .mockResolvedValueOnce({ id: userId, is_admin: true, owner_user_id: null }); // canManageUsers

  return user;
}

describe('POST /api/auth/register', () => {
  it('deve registrar um novo usuário com sucesso', async () => {
    prisma.user.findUnique.mockResolvedValue(null); // email not taken
    prisma.user.create.mockResolvedValue(makeUser({ id: USER_ID, email: 'new@example.com' }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Test User', email: 'new@example.com', senha: 'Senha123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('email', 'new@example.com');
    expect(res.body.user).not.toHaveProperty('senha');
  });

  it('deve rejeitar campos obrigatórios ausentes', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('deve rejeitar senha fraca', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Test', email: 'test@example.com', senha: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/senha/i);
  });

  it('deve rejeitar email duplicado', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Test', email: 'existing@example.com', senha: 'Senha123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/e-mail/i);
  });
});

describe('POST /api/auth/login', () => {
  it('deve fazer login com credenciais válidas', async () => {
    const hash = await bcrypt.hash('Senha123', 1);
    const user = makeUser({ senha: hash });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, senha: 'Senha123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).not.toHaveProperty('senha');
  });

  it('deve rejeitar senha incorreta com 401', async () => {
    const hash = await bcrypt.hash('SenhaCorreta1', 1);
    prisma.user.findUnique.mockResolvedValue(makeUser({ senha: hash }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', senha: 'SenhaErrada1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credenciais/i);
  });

  it('deve rejeitar usuário inexistente com 401 (não expõe existência)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@example.com', senha: 'Senha123' });

    expect(res.status).toBe(401);
    // Must not reveal whether email exists
    expect(res.body.error).toMatch(/credenciais/i);
  });
});

describe('GET /api/auth/me', () => {
  it('deve retornar perfil do usuário autenticado', async () => {
    mockAuthenticatedUser();

    const res = await request(app)
      .get('/api/auth/me')
      .set(AUTH_HEADER(USER_ID));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).not.toHaveProperty('senha');
  });

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('deve retornar 401 com token expirado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${generateExpiredToken(USER_ID)}`);

    expect(res.status).toBe(401);
  });

  it('deve retornar 401 com token inválido/manipulado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('deve retornar 200 mesmo para email inexistente (anti-enumeração)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'naoexiste@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/se o e-mail existir/i);
  });

  it('deve retornar 400 sem email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('deve rejeitar token inválido', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token', senha: 'NovaSenha123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/link/i);
  });

  it('deve rejeitar nova senha fraca', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'any-token', senha: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/senha/i);
  });
});

describe('POST /api/auth/logout', () => {
  it('deve limpar cookie de sessão', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    // Cookie should be cleared
    const setCookieHeader = res.headers['set-cookie'];
    if (setCookieHeader) {
      const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;
      expect(cookieStr).toMatch(/gestaolocacoes\.session/);
    }
  });
});

describe('POST /api/auth/complete-tour', () => {
  it('deve marcar o tour como concluído com sucesso', async () => {
    mockAuthenticatedUser();
    prisma.user.update.mockResolvedValue({ id: USER_ID, has_seen_tour: true });

    const res = await request(app)
      .post('/api/auth/complete-tour')
      .set(AUTH_HEADER(USER_ID));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: USER_ID },
      data: { has_seen_tour: true }
    }));
  });

  it('deve retornar 401 para usuário não autenticado', async () => {
    const res = await request(app).post('/api/auth/complete-tour');
    expect(res.status).toBe(401);
  });
});
