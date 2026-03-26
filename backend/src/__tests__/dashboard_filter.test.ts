import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';

jest.mock('../prisma');
const { prisma } = require('../prisma');

const OWNER_ID = 'owner-123';

describe('Dashboard Controller - Filter Bloqueios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: OWNER_ID });
  });

  it('deve excluir bloqueios (sem locatário) das estatísticas do dashboard', async () => {
    // Simular que o Prisma retorna 1 reserva real e 1 bloqueio (que filtrariamos no SELECT, mas o mock simula o resultado final esperado)
    // Na verdade, o mock deve simular que o Prisma FOI CHAMADO com o filtro correto.
    
    prisma.reservation.count.mockResolvedValue(1); // Simula que apenas 1 passou no filtro de count
    prisma.reservation.findMany.mockResolvedValue([
      { id: 'res-1', locatario_id: 'tenant-1', locatario: { nome: 'Hóspede Real' }, imovel: { nome: 'Casa' } }
    ]);
    prisma.payment.aggregate.mockResolvedValue({ _sum: { valor: 0 } });
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.property.count.mockResolvedValue(1);
    prisma.tenant.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(200);
    
    // Verificar se o Prisma foi chamado com o filtro locatario_id: { not: null }
    expect(prisma.reservation.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        locatario_id: { not: null }
      })
    }));

    expect(prisma.reservation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        locatario_id: { not: null }
      })
    }));

    // O resultado não deve conter menção a "Bloqueio" (no dashboard_filter.test.ts)
    expect(res.body.upcomingCheckins[0].locatario.nome).toBe('Hóspede Real');
  });
});
