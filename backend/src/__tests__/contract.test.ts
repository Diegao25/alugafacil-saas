import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';
import { makeUser, makeReservation, makeProperty, makeTenant, makeContractDraft } from './helpers/factories';

jest.mock('../prisma');
const { prisma } = require('../prisma');

const USER_ID = 'user-owner-123';
const OTHER_USER_ID = 'other-user-456';
const FUTURE_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

function setupAuth(userId = USER_ID) {
  // 1. authenticate middleware
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId });
  // 2. checkTrial middleware
  prisma.user.findUnique.mockResolvedValueOnce({
    plan_type: 'trial',
    trial_end_date: FUTURE_DATE,
    subscription_status: 'trial_active',
    access_until: null,
  });
  // 3. resolveOwnerId (in controller)
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId, is_admin: true, owner_user_id: null });
}

describe('Contract Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReservation = (userId = USER_ID) => {
    const property = makeProperty({ usuario_id: userId });
    const tenant = makeTenant({ usuario_id: userId });
    return makeReservation({
      imovel_id: property.id,
      locatario_id: tenant.id,
      imovel: { ...property, user: makeUser({ id: userId }) },
      locatario: tenant,
      pagamentos: [],
      contrato: null
    });
  };

  describe('GET /api/contracts/:id/draft', () => {
    it('deve retornar 404 se o rascunho não existir', async () => {
      setupAuth();
      const reservation = mockReservation();
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      const res = await request(app)
        .get(`/api/contracts/${reservation.id}/draft`)
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/rascunho/i);
    });

    it('deve retornar o rascunho se ele existir', async () => {
      setupAuth();
      const draft = makeContractDraft();
      const reservation = { ...mockReservation(), contrato: draft };
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      const res = await request(app)
        .get(`/api/contracts/${reservation.id}/draft`)
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.content).toBe(draft.content);
    });

    it('deve rejeitar acesso de outro usuário', async () => {
      // authenticate
      prisma.user.findUnique.mockResolvedValueOnce({ id: OTHER_USER_ID });
      // checkTrial
      prisma.user.findUnique.mockResolvedValueOnce({ plan_type: 'trial', trial_end_date: FUTURE_DATE, subscription_status: 'trial_active' });
      // resolveOwnerId
      prisma.user.findUnique.mockResolvedValueOnce({ id: OTHER_USER_ID, is_admin: true, owner_user_id: null });

      const reservation = mockReservation(USER_ID);
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      const res = await request(app)
        .get(`/api/contracts/${reservation.id}/draft`)
        .set(AUTH_HEADER(OTHER_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/contracts/:id/draft', () => {
    it('deve salvar um novo rascunho (upsert)', async () => {
      setupAuth();
      const reservation = mockReservation();
      prisma.reservation.findUnique.mockResolvedValue(reservation);
      prisma.contractDraft.upsert.mockResolvedValue({
        reserva_id: reservation.id,
        content: 'Novo conteúdo'
      });

      const res = await request(app)
        .put(`/api/contracts/${reservation.id}/draft`)
        .set(AUTH_HEADER(USER_ID))
        .send({ content: 'Novo conteúdo' });

      expect(res.status).toBe(200);
      expect(prisma.contractDraft.upsert).toHaveBeenCalled();
    });
  });

  describe('GET /api/contracts/:id', () => {
    it('deve gerar PDF com sucesso', async () => {
      setupAuth();
      const reservation = mockReservation();
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      const res = await request(app)
        .get(`/api/contracts/${reservation.id}`)
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  describe('POST /api/contracts/:id/share', () => {
    it('deve gerar um link de compartilhamento JWT', async () => {
      setupAuth();
      const reservation = mockReservation();
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      const res = await request(app)
        .post(`/api/contracts/${reservation.id}/share`)
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('link');
      expect(res.body.link).toContain('token=');
    });
  });

  describe('GET /api/public/contracts/share', () => {
    it('deve validar token e servir PDF publicamente', async () => {
      const reservation = mockReservation();
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      // We need to bypass the JWT verification in the controller or use a real secret
      // Since we use getJwtSecret() in the controller, and it reads from process.env.JWT_SECRET
      // which is set by jwt.helper.ts, we can just generate a token here.
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ contractId: reservation.id }, 'test-secret-for-jest-tests');

      const res = await request(app)
        .get(`/api/public/contracts/share?token=${token}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
    });

    it('deve rejeitar token ausente', async () => {
      const res = await request(app).get('/api/public/contracts/share');
      expect(res.status).toBe(400);
    });
  });
});
