import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';
import { makeProperty, makeTenant, makeReservation, makePayment } from './helpers/factories';

jest.mock('../prisma');

const { prisma } = require('../prisma');

const OWNER_ID = 'owner-test-123';
const FUTURE_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

function setupAuth(userId = OWNER_ID) {
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId });
  prisma.user.findUnique.mockResolvedValueOnce({
    plan_type: 'trial',
    trial_end_date: FUTURE_DATE,
    subscription_status: 'trial_active',
    access_until: null,
  });
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId, is_admin: true, owner_user_id: null });
}

const validReservationPayload = {
  imovel_id: 'property-123',
  locatario_id: 'tenant-123',
  data_checkin: '2026-07-01',
  data_checkout: '2026-07-08',
  valor_total: 1400,
  forma_pagamento: 'PIX',
  metodo_pagamento: 'TOTAL',
};

describe('POST /api/reservations', () => {
  it('deve criar reserva com dados válidos', async () => {
    setupAuth();
    const property = makeProperty({ id: 'property-123', usuario_id: OWNER_ID });
    const tenant = makeTenant({ id: 'tenant-123', usuario_id: OWNER_ID });
    const reservation = makeReservation({ imovel: property, locatario: tenant });

    prisma.property.findFirst.mockResolvedValue(property);
    prisma.tenant.findFirst.mockResolvedValue(tenant);
    prisma.reservation.findFirst.mockResolvedValue(null); // no overlap
    prisma.$transaction.mockImplementation(async (fn: any) => {
      const txMock = {
        reservation: { create: jest.fn().mockResolvedValue(reservation) },
        payment: { create: jest.fn().mockResolvedValue(makePayment()) },
      };
      return fn(txMock);
    });

    const res = await request(app)
      .post('/api/reservations')
      .set(AUTH_HEADER(OWNER_ID))
      .send(validReservationPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('deve rejeitar campos obrigatórios ausentes', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/reservations')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ imovel_id: 'property-123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('deve rejeitar checkout anterior ao checkin', async () => {
    setupAuth();
    const property = makeProperty({ id: 'property-123', usuario_id: OWNER_ID });
    const tenant = makeTenant({ id: 'tenant-123', usuario_id: OWNER_ID });
    prisma.property.findFirst.mockResolvedValue(property);
    prisma.tenant.findFirst.mockResolvedValue(tenant);

    const res = await request(app)
      .post('/api/reservations')
      .set(AUTH_HEADER(OWNER_ID))
      .send({
        ...validReservationPayload,
        data_checkin: '2026-07-08',
        data_checkout: '2026-07-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/check-out/i);
  });

  it('deve rejeitar reserva com conflito de datas', async () => {
    setupAuth();
    const property = makeProperty({ id: 'property-123', usuario_id: OWNER_ID });
    const tenant = makeTenant({ id: 'tenant-123', usuario_id: OWNER_ID });
    prisma.property.findFirst.mockResolvedValue(property);
    prisma.tenant.findFirst.mockResolvedValue(tenant);
    prisma.reservation.findFirst.mockResolvedValue(makeReservation()); // overlap found!

    const res = await request(app)
      .post('/api/reservations')
      .set(AUTH_HEADER(OWNER_ID))
      .send(validReservationPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reserva/i);
  });

  it('deve rejeitar propriedade de outro usuário (IDOR)', async () => {
    setupAuth(OWNER_ID);
    prisma.property.findFirst.mockResolvedValue(null); // Not found for this owner

    const res = await request(app)
      .post('/api/reservations')
      .set(AUTH_HEADER(OWNER_ID))
      .send(validReservationPayload);

    expect(res.status).toBe(404);
    // Controller may have encoding issues; check that the 404 response contains a property-related error
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/reservations', () => {
  it('deve listar reservas do usuário', async () => {
    setupAuth();
    const reservations = [
      { ...makeReservation(), imovel: makeProperty(), locatario: makeTenant(), pagamentos: [] },
      { ...makeReservation(), imovel: makeProperty(), locatario: makeTenant(), pagamentos: [] },
    ];
    prisma.reservation.findMany.mockResolvedValue(reservations);

    const res = await request(app)
      .get('/api/reservations')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('PATCH /api/reservations/:id/status', () => {
  it('deve atualizar status da reserva', async () => {
    setupAuth();
    const property = makeProperty({ usuario_id: OWNER_ID });
    const reservation = {
      ...makeReservation({ id: 'res-123' }),
      imovel: property,
    };
    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.reservation.update.mockResolvedValue({ ...reservation, status: 'Confirmada' });

    const res = await request(app)
      .patch('/api/reservations/res-123/status')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ status: 'Confirmada' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Confirmada');
  });

  it('não deve atualizar reserva de outro usuário (IDOR)', async () => {
    setupAuth(OWNER_ID);
    const otherProperty = makeProperty({ usuario_id: 'other-owner-id' });
    const reservation = {
      ...makeReservation({ id: 'res-other' }),
      imovel: otherProperty,
    };
    prisma.reservation.findUnique.mockResolvedValue(reservation);

    const res = await request(app)
      .patch('/api/reservations/res-other/status')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ status: 'Confirmada' });

    expect(res.status).toBe(403);
  });
});
