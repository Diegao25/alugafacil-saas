import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';
import { makeTenant, VALID_CPF } from './helpers/factories';

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

describe('POST /api/tenants', () => {
  it('deve criar locatário com dados válidos', async () => {
    setupAuth();
    const tenant = makeTenant({ usuario_id: OWNER_ID });
    prisma.tenant.create.mockResolvedValue(tenant);

    const res = await request(app)
      .post('/api/tenants')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ nome: 'João Silva', cpf: VALID_CPF });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('deve rejeitar CPF inválido', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/tenants')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ nome: 'João Silva', cpf: '111.111.111-11' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/CPF|CNPJ/i);
  });

  it('deve rejeitar CPF ausente', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/tenants')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ nome: 'João Silva' });

    expect(res.status).toBe(400);
  });

  it('deve rejeitar nome ausente', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/tenants')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ cpf: VALID_CPF });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nome/i);
  });
});

describe('GET /api/tenants', () => {
  it('deve listar locatários do usuário', async () => {
    setupAuth();
    prisma.tenant.findMany.mockResolvedValue([makeTenant(), makeTenant()]);

    const res = await request(app)
      .get('/api/tenants')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('DELETE /api/tenants/:id', () => {
  it('deve retornar 409 ao deletar locatário com reservas vinculadas', async () => {
    setupAuth();
    prisma.tenant.findFirst.mockResolvedValue(makeTenant({ id: 'tenant-123' }));
    prisma.reservation.count.mockResolvedValue(2);

    const res = await request(app)
      .delete('/api/tenants/tenant-123')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/reservas/i);
  });

  it('deve deletar locatário sem reservas vinculadas', async () => {
    setupAuth();
    const tenant = makeTenant({ id: 'tenant-123' });
    prisma.tenant.findFirst.mockResolvedValue(tenant);
    prisma.reservation.count.mockResolvedValue(0);
    prisma.tenant.delete.mockResolvedValue(tenant);

    const res = await request(app)
      .delete('/api/tenants/tenant-123')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(204);
  });
});
