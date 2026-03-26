import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';
import { makeUser, makeReservation, makeProperty, makeTenant } from './helpers/factories';

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

describe('Payment Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReservation = (userId = USER_ID) => {
    const property = makeProperty({ usuario_id: userId });
    return makeReservation({
      imovel_id: property.id,
      imovel: { ...property, user: makeUser({ id: userId }) },
      pagamentos: []
    });
  };

  describe('POST /api/payments', () => {
    it('deve criar um pagamento com sucesso', async () => {
      setupAuth();
      const reservation = mockReservation();
      prisma.reservation.findUnique.mockResolvedValue(reservation);
      prisma.payment.create.mockResolvedValue({ id: 'pay-123', valor: 100, tipo: 'Aluguel' });

      const res = await request(app)
        .post('/api/payments')
        .set(AUTH_HEADER(USER_ID))
        .send({
          reserva_id: reservation.id,
          valor: 100,
          tipo: 'Aluguel'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('pay-123');
    });

    it('deve retornar 403 se a reserva pertencer a outro usuário', async () => {
      setupAuth();
      const reservation = mockReservation(OTHER_USER_ID);
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      const res = await request(app)
        .post('/api/payments')
        .set(AUTH_HEADER(USER_ID))
        .send({
          reserva_id: reservation.id,
          valor: 100,
          tipo: 'Aluguel'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/payments', () => {
    it('deve listar pagamentos do proprietário', async () => {
      setupAuth();
      prisma.payment.findMany.mockResolvedValue([{ id: 'pay-1', valor: 100 }]);

      const res = await request(app)
        .get('/api/payments')
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PATCH /api/payments/:id/status', () => {
    it('deve atualizar o status do pagamento', async () => {
      setupAuth();
      const payment = {
        id: 'pay-1',
        reserva: { imovel: { usuario_id: USER_ID } }
      };
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payment.update.mockResolvedValue({ ...payment, status: 'Pago' });

      const res = await request(app)
        .patch('/api/payments/pay-1/status')
        .set(AUTH_HEADER(USER_ID))
        .send({ status: 'Pago' });

      expect(res.status).toBe(200);
    });

    it('deve retornar 404 se o pagamento não existir', async () => {
      setupAuth();
      prisma.payment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/payments/non-existent/status')
        .set(AUTH_HEADER(USER_ID))
        .send({ status: 'Pago' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/payments/:id', () => {
    it('deve excluir um pagamento', async () => {
      setupAuth();
      const payment = {
        id: 'pay-1',
        reserva: { imovel: { usuario_id: USER_ID } }
      };
      prisma.payment.findUnique.mockResolvedValue(payment);

      const res = await request(app)
        .delete('/api/payments/pay-1')
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(204);
    });
  });
});
