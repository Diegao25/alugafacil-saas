import request from 'supertest';
import app from '../app';
import { AUTH_HEADER } from './helpers/jwt.helper';
import { makeProperty, makeUser } from './helpers/factories';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../prisma');

const { prisma } = require('../prisma');

const OWNER_ID = 'owner-test-123';
const FUTURE_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

function setupAuth(userId = OWNER_ID) {
  // authenticate middleware
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId });
  // checkTrial middleware
  prisma.user.findUnique.mockResolvedValueOnce({
    plan_type: 'trial',
    trial_end_date: FUTURE_DATE,
    subscription_status: 'trial_active',
    access_until: null,
  });
  // resolveOwnerId (in controller)
  prisma.user.findUnique.mockResolvedValueOnce({ id: userId, is_admin: true, owner_user_id: null });
}

describe('POST /api/properties', () => {
  it('deve criar propriedade com campos válidos', async () => {
    setupAuth();
    const property = makeProperty({ usuario_id: OWNER_ID });
    prisma.property.create.mockResolvedValue(property);

    const res = await request(app)
      .post('/api/properties')
      .set(AUTH_HEADER(OWNER_ID))
      .send({
        nome: 'Casa de Praia',
        endereco: 'Rua do Mar, 123',
        valor_diaria: 200,
        capacidade_maxima: 8,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nome).toBe(property.nome);
  });

  it('deve retornar 400 com campos obrigatórios ausentes', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/properties')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ nome: 'Apenas o nome' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('deve retornar 401 sem autenticação', async () => {
    const res = await request(app)
      .post('/api/properties')
      .send({ nome: 'Test', endereco: 'Test', valor_diaria: 100, capacidade_maxima: 4 });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/properties', () => {
  it('deve listar propriedades do usuário autenticado', async () => {
    setupAuth();
    const properties = [makeProperty({ usuario_id: OWNER_ID }), makeProperty({ usuario_id: OWNER_ID })];
    prisma.property.findMany.mockResolvedValue(properties);

    const res = await request(app)
      .get('/api/properties')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('deve retornar lista vazia quando não há propriedades', async () => {
    setupAuth();
    prisma.property.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/properties')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/properties/:id', () => {
  it('deve retornar propriedade pelo ID', async () => {
    setupAuth();
    const property = makeProperty({ id: 'prop-123', usuario_id: OWNER_ID });
    prisma.property.findFirst.mockResolvedValue(property);

    const res = await request(app)
      .get('/api/properties/prop-123')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('prop-123');
  });

  it('deve retornar 404 para propriedade inexistente', async () => {
    setupAuth();
    prisma.property.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/properties/nonexistent')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/properties/:id', () => {
  it('deve atualizar propriedade', async () => {
    setupAuth();
    const property = makeProperty({ id: 'prop-123', usuario_id: OWNER_ID });
    prisma.property.findFirst.mockResolvedValue(property);
    prisma.property.update.mockResolvedValue({ ...property, nome: 'Nome Atualizado' });

    const res = await request(app)
      .put('/api/properties/prop-123')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ nome: 'Nome Atualizado', endereco: property.endereco, valor_diaria: property.valor_diaria, capacidade_maxima: property.capacidade_maxima });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Nome Atualizado');
  });

  it('não deve atualizar propriedade de outro usuário (IDOR)', async () => {
    setupAuth(OWNER_ID);
    prisma.property.findFirst.mockResolvedValue(null); // Property belongs to different owner

    const res = await request(app)
      .put('/api/properties/prop-other-owner')
      .set(AUTH_HEADER(OWNER_ID))
      .send({ nome: 'Hack' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/properties/:id', () => {
  it('deve deletar propriedade', async () => {
    setupAuth();
    const property = makeProperty({ id: 'prop-123', usuario_id: OWNER_ID });
    prisma.property.findFirst.mockResolvedValue(property);
    prisma.property.delete.mockResolvedValue(property);

    const res = await request(app)
      .delete('/api/properties/prop-123')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(204);
  });

  it('deve retornar 400 ao tentar deletar propriedade com reservas', async () => {
    setupAuth();
    const property = makeProperty({ id: 'prop-123', usuario_id: OWNER_ID });
    prisma.property.findFirst.mockResolvedValue(property);

    const foreignKeyError = new Error('P2003: Foreign key constraint failed');
    (foreignKeyError as any).code = 'P2003';
    prisma.property.delete.mockRejectedValue(foreignKeyError);

    const res = await request(app)
      .delete('/api/properties/prop-123')
      .set(AUTH_HEADER(OWNER_ID));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reservas/i);
  });
});
