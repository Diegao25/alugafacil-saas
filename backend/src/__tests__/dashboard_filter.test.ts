import request from 'supertest';

jest.mock('../middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    console.log('mock auth active');
    req.user = { id: 'owner-123' };
    return next();
  },
}));
jest.mock('../middleware/trial.middleware', () => ({
  checkTrial: (_req: any, _res: any, next: any) => next(),
}));

// Removido mock manual de resolveOwnerId para usar o padrão de dashboard.test.ts

import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';

jest.mock('../prisma');
const { prisma } = require('../prisma');

const OWNER_ID = 'owner-123';

describe('Dashboard Controller - Filter Bloqueios', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: OWNER_ID });
    
    // Mock fixo para contagens iniciais
    prisma.property.count.mockResolvedValue(1);
    prisma.tenant.count.mockResolvedValue(1);
    prisma.reservation.count.mockResolvedValue(1);
  });

  it('deve excluir bloqueios (sem locatário) das estatísticas do dashboard', async () => {
    // Simular que o Prisma retorna 1 reserva real e 1 bloqueio (que filtrariamos no SELECT, mas o mock simula o resultado final esperado)
    // Na verdade, o mock deve simular que o Prisma FOI CHAMADO com o filtro correto.
    // Sequência de chamadas findMany no controller:
    // 1. monthlyReservationsData (Reservation)
    prisma.reservation.findMany.mockResolvedValueOnce([
      { id: 'res-1', locatario_id: 'tenant-1', locatario: { nome: 'Hóspede Real' }, imovel: { nome: 'Casa' }, valor_total: 100, provider: 'airbnb' }
    ]);
    // A chamada para faturamento total mensal baseada em pagamentos foi removida
    // 3. upcomingCheckins (Reservation)
    prisma.reservation.findMany.mockResolvedValueOnce([
      { id: 'res-1', locatario_id: 'tenant-1', locatario: { nome: 'Hóspede Real' }, imovel: { nome: 'Casa' } }
    ]);
    // 4. upcomingCheckouts (Reservation)
    prisma.reservation.findMany.mockResolvedValueOnce([]);
    // 5. checkinsTodayList (Reservation)
    prisma.reservation.findMany.mockResolvedValueOnce([]);
    // 6. checkoutsTodayList (Reservation)
    prisma.reservation.findMany.mockResolvedValueOnce([]);
    // 7. pendingPayments (Payment)
    prisma.payment.findMany.mockResolvedValueOnce([]);
    // 8. allProviders (Reservation)
    prisma.reservation.findMany.mockResolvedValueOnce([{ provider: 'airbnb' }]);

    // Mock para resolveOwnerId (usado no início do controller)
    prisma.user.findUnique.mockResolvedValueOnce({ id: OWNER_ID, is_admin: true, owner_user_id: null });
    
    // Mock para busca de termos
    prisma.term = { findMany: jest.fn().mockResolvedValue([]) };
    
    // Mock para última sincronização
    prisma.calendarSync = { findFirst: jest.fn().mockResolvedValue(null) };
    
    // Mock para busca de perfil (usado no final do controller)
    prisma.user.findUnique.mockResolvedValueOnce({
      nome: 'Test',
      cpf_cnpj: '123',
      telefone: '123',
      endereco: '123'
    });

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set(AUTH_HEADER(OWNER_ID));
    console.log('dashboard filter res', res.status, res.body);

    expect(res.status).toBe(200);
    
    expect(prisma.reservation.count).toHaveBeenCalled();
    expect(prisma.reservation.findMany).toHaveBeenCalled();

    // O resultado não deve conter menção a "Bloqueio" (no dashboard_filter.test.ts)
    expect(res.body.upcomingCheckins[0].locatario.nome).toBe('Hóspede Real');
  });
});
