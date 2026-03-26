import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';
import { makeUser, makeProperty, makeReservation, makePayment, makeTenant } from './helpers/factories';

jest.mock('../prisma');
const { prisma } = require('../prisma');

const USER_ID = 'user-owner-123';
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

describe('Dashboard Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    it('deve retornar estatísticas completas com sucesso', async () => {
      setupAuth();

      // Mock counts
      prisma.property.count.mockResolvedValue(10);
      prisma.tenant.count.mockResolvedValue(5);
      prisma.reservation.count.mockResolvedValue(2); // reservationsToday
      prisma.reservation.count.mockResolvedValueOnce(2) // TotalProps (wait, I already did mockResolvedValue above)
      
      // Let's use mockResolvedValueOnce for clarity if needed, or just mockResolvedValue
      prisma.property.count.mockResolvedValue(10);
      prisma.tenant.count.mockResolvedValue(5);
      // Calls for reservation counts (Today Checkins, Today Checkouts, Future Checkins)
      prisma.reservation.count.mockResolvedValue(3); 

      // Mock aggregate for revenue
      prisma.payment.aggregate.mockResolvedValue({
        _sum: { valor: 5000 }
      });

      // Mock findMany for lists
      prisma.reservation.findMany.mockResolvedValue([
        makeReservation({ id: 'res-1' })
      ]);
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay-1', valor: 100 }
      ]);

      // Mock user profile check
      prisma.user.findUnique.mockResolvedValueOnce({
        nome: 'Test',
        cpf_cnpj: '123',
        telefone: '123',
        endereco: '123'
      });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalProperties', 10);
      expect(res.body).toHaveProperty('monthlyRevenue', 5000);
      expect(res.body).toHaveProperty('profileCompleted', true);
    });

    it('deve retornar faturamento zero se não houver pagamentos', async () => {
      setupAuth();
      prisma.payment.aggregate.mockResolvedValue({ _sum: { valor: null } });
      
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set(AUTH_HEADER(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.monthlyRevenue).toBe(0);
    });
  });
});
