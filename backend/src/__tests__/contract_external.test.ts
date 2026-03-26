import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';

jest.mock('../prisma');
const { prisma } = require('../prisma');

const OWNER_ID = 'owner-123';
const EXTERNAL_RES_ID = 'external-456';

describe('Contract Controller - External Block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Auth findUnique
    prisma.user.findUnique.mockResolvedValue({ id: OWNER_ID });
  });

  it('deve rejeitar geração de PDF para reserva externa', async () => {
    prisma.reservation.findUnique.mockResolvedValue({
      id: EXTERNAL_RES_ID,
      provider: 'Airbnb', // Marcadador de externa
      locatario: null,     // Marcadador de externa
      imovel: { usuario_id: OWNER_ID }
    });

    const res = await request(app)
      .get(`/api/contracts/${EXTERNAL_RES_ID}`)
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('externas');
  });

  it('deve rejeitar busca de rascunho para reserva externa', async () => {
    prisma.reservation.findUnique.mockResolvedValue({
      id: EXTERNAL_RES_ID,
      provider: 'Booking',
      imovel: { usuario_id: OWNER_ID }
    });

    const res = await request(app)
      .get(`/api/contracts/${EXTERNAL_RES_ID}/draft`)
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('disponíveis');
  });
});
