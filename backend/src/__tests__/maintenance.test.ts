import request from 'supertest';
import app from '../app';

describe('Modo de Manutenção (Centralizado)', () => {
  const originalEnv = process.env.MAINTENANCE_MODE;

  afterAll(() => {
    process.env.MAINTENANCE_MODE = originalEnv;
  });

  it('deve retornar 503 em rotas protegidas quando a manutenção está ativa', async () => {
    process.env.MAINTENANCE_MODE = 'true';
    const response = await request(app).get('/api/reservations');
    
    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('error', 'maintenance');
  });

  it('deve permitir acesso à configuração pública mesmo em manutenção (EXCEÇÃO)', async () => {
    process.env.MAINTENANCE_MODE = 'true';
    const response = await request(app).get('/api/public/config');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('isMaintenanceMode', true);
  });

  it('deve permitir acesso normal quando a manutenção está desligada', async () => {
    process.env.MAINTENANCE_MODE = 'false';
    const response = await request(app).get('/api/reservations');
    
    // Como não estamos logados, o erro esperado é 401 e não 503
    expect(response.status).toBe(401);
  });
});
