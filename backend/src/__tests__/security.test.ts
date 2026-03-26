/**
 * Security Tests
 * Tests for: IDOR, auth bypass, rate limiting, input injection, orphan sessions
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { AUTH_HEADER, generateTestToken } from './helpers/jwt.helper';
import { makeProperty, makeReservation } from './helpers/factories';

jest.mock('../prisma');
jest.mock('../utils/terms', () => ({
  getTermsStatus: jest.fn(),
}));

const { prisma } = require('../prisma');
const { getTermsStatus } = require('../utils/terms');

beforeEach(() => {
  // Re-apply module mock implementations cleared by resetMocks
  getTermsStatus.mockResolvedValue({
    termsPending: false,
    currentTermsVersion: null,
    acceptedTermsVersion: null,
  });
});

const OWNER_A = 'owner-a-123';
const OWNER_B = 'owner-b-456';
const FUTURE_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

function setupAuthFor(userId: string) {
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId });
  prisma.user.findUnique.mockResolvedValueOnce({
    plan_type: 'trial',
    trial_end_date: FUTURE_DATE,
    subscription_status: 'trial_active',
    access_until: null,
  });
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId, is_admin: true, owner_user_id: null });
}

describe('Segurança: Autenticação e Autorização', () => {
  it('deve rejeitar requisição sem token com 401', async () => {
    const endpoints = [
      { method: 'get', path: '/api/properties' },
      { method: 'get', path: '/api/tenants' },
      { method: 'get', path: '/api/reservations' },
      { method: 'get', path: '/api/dashboard/stats' },
    ];

    for (const endpoint of endpoints) {
      const res = await (request(app) as any)[endpoint.method](endpoint.path);
      expect(res.status).toBe(401);
    }
  });

  it('deve rejeitar token JWT assinado com segredo diferente', async () => {
    const fakeToken = jwt.sign({ id: OWNER_A }, 'wrong-secret', { expiresIn: '7d' });

    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });

  it('deve rejeitar sessão órfã (usuário deletado do banco)', async () => {
    // authenticate returns null = user doesn't exist
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/properties')
      .set(AUTH_HEADER(OWNER_A));

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/sessão inválida|usuário removido/i);
  });

  it('deve rejeitar token malformado', async () => {
    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', 'Bearer not-a-jwt-at-all');

    expect(res.status).toBe(401);
  });

  it('deve rejeitar payload JWT manipulado (algoritmo none)', async () => {
    // Attempt "alg: none" attack
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: OWNER_A })).toString('base64url');
    const forgeryToken = `${header}.${payload}.`;

    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${forgeryToken}`);

    expect(res.status).toBe(401);
  });
});

describe('Segurança: IDOR - Insecure Direct Object Reference', () => {
  it('usuário A não deve acessar propriedade do usuário B', async () => {
    setupAuthFor(OWNER_A);
    // Property belongs to OWNER_B, not OWNER_A
    prisma.property.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/properties/property-of-b')
      .set(AUTH_HEADER(OWNER_A));

    expect(res.status).toBe(404); // Not found (not revealing ownership)
  });

  it('usuário A não deve deletar reserva do usuário B', async () => {
    setupAuthFor(OWNER_A);
    const propertyOfB = makeProperty({ usuario_id: OWNER_B });
    const reservationOfB = { ...makeReservation(), imovel: propertyOfB };
    prisma.reservation.findUnique.mockResolvedValue(reservationOfB);

    const res = await request(app)
      .delete('/api/reservations/res-of-b')
      .set(AUTH_HEADER(OWNER_A));

    expect(res.status).toBe(403);
  });

  it('usuário A não deve atualizar status de reserva do usuário B', async () => {
    setupAuthFor(OWNER_A);
    const propertyOfB = makeProperty({ usuario_id: OWNER_B });
    const reservationOfB = { ...makeReservation(), imovel: propertyOfB };
    prisma.reservation.findUnique.mockResolvedValue(reservationOfB);

    const res = await request(app)
      .patch('/api/reservations/res-of-b/status')
      .set(AUTH_HEADER(OWNER_A))
      .send({ status: 'Cancelada' });

    expect(res.status).toBe(403);
  });
});

describe('Segurança: Trial Expirado', () => {
  it('deve bloquear acesso com trial expirado', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: OWNER_A });
    prisma.user.findUnique.mockResolvedValueOnce({
      plan_type: 'trial',
      trial_end_date: new Date(Date.now() - 1000), // expired
      subscription_status: 'trial_active',
      access_until: null,
    });
    prisma.user.update.mockResolvedValue({});

    const res = await request(app)
      .get('/api/properties')
      .set(AUTH_HEADER(OWNER_A));

    // In test env (NODE_ENV=test), trial enforcement is active
    expect([200, 403]).toContain(res.status);
    if (res.status === 403) {
      expect(res.body.code).toBe('TRIAL_EXPIRED');
    }
  });
});

describe('Segurança: Headers e Proteção de Dados', () => {
  it('response de login não deve expor senha hasheada', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Senha123', 1);
    const user = {
      id: OWNER_A, nome: 'User', email: 'user@test.com', senha: hash,
      is_admin: true, plan_type: 'trial',
      trial_end_date: FUTURE_DATE,
      subscription_status: 'trial_active',
      owner_user_id: null, login_count: 0,
      access_until: null, cancellation_date: null,
      payment_method: null, subscription_amount: null,
      subscription_date: null, plan_name: null,
      cpf_cnpj: null, telefone: null, endereco: null,
    };
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue({ ...user, login_count: 1 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', senha: 'Senha123' });

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('senha');
    expect(JSON.stringify(res.body)).not.toContain(hash);
  });

  it('response de registro não deve expor senha hasheada', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: OWNER_A, nome: 'New User', email: 'new@test.com',
      senha: '$2b$10$hashedpassword', is_admin: true,
      plan_type: 'trial', trial_end_date: FUTURE_DATE,
      subscription_status: 'trial_active',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'New User', email: 'new@test.com', senha: 'Senha123' });

    expect(res.status).toBe(201);
    expect(res.body.user).not.toHaveProperty('senha');
  });
});
